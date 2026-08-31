package auth

import (
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/middleware"
)

// CookieName adalah nama cookie sesi admin.
const CookieName = "sid"

const sessionKey = "admin_session"

// Handler menangani endpoint auth admin.
type Handler struct {
	svc *Service
	cfg *config.Config
	log *slog.Logger
}

// NewHandler membuat Handler auth.
func NewHandler(svc *Service, cfg *config.Config, log *slog.Logger) *Handler {
	return &Handler{svc: svc, cfg: cfg, log: log}
}

// Register memasang rute auth publik (login & probe sesi).
func (h *Handler) Register(r fiber.Router) {
	r.Post("/admin/login", h.Login)
	r.Get("/admin/me", h.Me)
}

// RegisterAdmin memasang rute auth ber-otentikasi (dalam grup /admin).
func (h *Handler) RegisterAdmin(r fiber.Router) {
	r.Post("/logout", h.Logout)
}

// Login menangani POST /api/v1/admin/login.
func (h *Handler) Login(c fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	sess, err := h.svc.Login(c.Context(), body.Email, body.Password, middleware.ClientIP(c))
	if err != nil {
		return httpx.WriteError(c, err)
	}

	c.Cookie(&fiber.Cookie{
		Name:     CookieName,
		Value:    sess.Token,
		Path:     "/",
		MaxAge:   h.cfg.SessionTTLHours * 3600,
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
	})

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"data": fiber.Map{
			"email":      sess.AdminEmail,
			"name":       sess.Name,
			"role":       sess.Role,
			"expires_at": sess.ExpiresAt.Format(time.RFC3339),
		},
	})
}

// Logout menangani POST /api/v1/admin/logout.
func (h *Handler) Logout(c fiber.Ctx) error {
	token := c.Cookies(CookieName)
	if token != "" {
		_ = h.svc.Logout(c.Context(), token)
	}
	c.Cookie(&fiber.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
	})
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// Me menangani GET /api/v1/admin/me (probe sesi admin tanpa memicu error 401 di browser).
func (h *Handler) Me(c fiber.Ctx) error {
	token := c.Cookies(CookieName)
	if token == "" {
		return httpx.JSON(c, fiber.StatusOK, fiber.Map{
			"success": true,
			"data":    nil,
		})
	}

	sess, err := h.svc.Lookup(c.Context(), token)
	if err != nil || sess == nil {
		return httpx.JSON(c, fiber.StatusOK, fiber.Map{
			"success": true,
			"data":    nil,
		})
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"data": fiber.Map{
			"email": sess.AdminEmail,
			"role":  sess.Role,
			"name":  sess.Name,
		},
	})
}

// SessionFromCtx mengambil sesi admin dari fiber.Ctx locals (nil bila tidak ada).
func SessionFromCtx(c fiber.Ctx) *Session {
	if sess, ok := c.Locals(sessionKey).(*Session); ok {
		return sess
	}
	return nil
}