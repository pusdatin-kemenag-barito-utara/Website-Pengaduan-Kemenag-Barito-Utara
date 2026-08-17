package auth

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/middleware"
)

// CookieName adalah nama cookie sesi admin.
const CookieName = "sid"

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

// Register memasang rute auth publik (login).
func (h *Handler) Register(r chi.Router) {
	r.Post("/admin/login", h.Login)
}

// RegisterAdmin memasang rute auth ber-otentikasi (dalam grup /admin).
func (h *Handler) RegisterAdmin(r chi.Router) {
	r.Post("/logout", h.Logout)
	r.Get("/me", h.Me)
}

// Login menangani POST /api/v1/admin/login.
func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
		return
	}

	sess, err := h.svc.Login(r.Context(), body.Email, body.Password, middleware.ClientIP(r))
	if err != nil {
		httpx.WriteError(w, err)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    sess.Token,
		Path:     "/",
		MaxAge:   h.cfg.SessionTTLHours * 3600,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})

	httpx.JSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"email":      sess.AdminEmail,
			"name":       sess.Name,
			"role":       sess.Role,
			"expires_at": sess.ExpiresAt.Format(time.RFC3339),
		},
	})
}

// Logout menangani POST /api/v1/admin/logout.
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	token, _ := r.Cookie(CookieName)
	if token != nil {
		_ = h.svc.Logout(r.Context(), token.Value)
	}
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// Me menangani GET /api/v1/admin/me.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	sess := SessionFromContext(r.Context())
	if sess == nil {
		httpx.WriteError(w, httpx.Unauthorized("unauthorized", "Sesi tidak valid."))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"email": sess.AdminEmail,
			"role":  sess.Role,
		},
	})
}

type ctxKey string

const sessionKey ctxKey = "admin_session"

// WithSession menempelkan sesi admin ke context.
func WithSession(ctx context.Context, sess *Session) context.Context {
	return context.WithValue(ctx, sessionKey, sess)
}

// SessionFromContext mengambil sesi admin dari context (nil bila tidak ada).
func SessionFromContext(ctx context.Context) *Session {
	sess, _ := ctx.Value(sessionKey).(*Session)
	return sess
}