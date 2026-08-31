package auth

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

// RequireAdmin memvalidasi cookie sesi dan menolak bila tidak sah.
// Memperbaiki temuan audit K1/K2: otorisasi wajib di sisi server.
func (h *Handler) RequireAdmin(c fiber.Ctx) error {
	token := c.Cookies(CookieName)
	if token == "" {
		return httpx.WriteError(c, httpx.Unauthorized("unauthorized", "Sesi tidak valid."))
	}

	sess, err := h.svc.Lookup(c.Context(), token)
	if err != nil {
		return httpx.WriteError(c, httpx.Unauthorized("unauthorized", "Sesi tidak valid atau kedaluwarsa."))
	}

	c.Locals(sessionKey, sess)
	return c.Next()
}