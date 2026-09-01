package admin

import (
	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

// GetSettings menangani GET /api/v1/admin/settings.
func (h *Handler) GetSettings(c fiber.Ctx) error {
	settings, err := h.repo.GetSettings(c.Context())
	if err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat pengaturan sistem."))
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": settings})
}

// UpdateSettings menangani POST /api/v1/admin/settings.
func (h *Handler) UpdateSettings(c fiber.Ctx) error {
	var body map[string]string
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	if err := h.repo.UpdateSettings(c.Context(), body); err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal menyimpan pengaturan."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"message": "Pengaturan sistem berhasil disimpan.",
	})
}
