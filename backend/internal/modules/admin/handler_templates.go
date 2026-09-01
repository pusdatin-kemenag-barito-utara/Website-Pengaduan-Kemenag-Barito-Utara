package admin

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// ListTemplates menangani GET /api/v1/admin/templates.
func (h *Handler) ListTemplates(c fiber.Ctx) error {
	items, err := h.repo.ListTemplates(c.Context())
	if err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat template tanggapan."))
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": items})
}

// CreateTemplate menangani POST /api/v1/admin/templates.
func (h *Handler) CreateTemplate(c fiber.Ctx) error {
	var body struct {
		Title        string `json:"title"`
		StatusTarget string `json:"status_target"`
		Content      string `json:"content"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	body.Title = strings.TrimSpace(body.Title)
	body.Content = strings.TrimSpace(body.Content)
	if body.Title == "" || body.Content == "" {
		return httpx.WriteError(c, httpx.BadRequest("invalid_input", "Judul dan isi template wajib diisi."))
	}
	if body.StatusTarget == "" || !validate.Status(body.StatusTarget) {
		body.StatusTarget = "Diproses"
	}

	tpl, err := h.repo.CreateTemplate(c.Context(), body.Title, body.StatusTarget, body.Content)
	if err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal menyimpan template."))
	}

	return httpx.JSON(c, fiber.StatusCreated, fiber.Map{"success": true, "data": tpl})
}

// UpdateTemplate menangani PATCH /api/v1/admin/templates/:id.
func (h *Handler) UpdateTemplate(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_id", "ID template tidak valid."))
	}

	var body struct {
		Title        *string `json:"title"`
		StatusTarget *string `json:"status_target"`
		Content      *string `json:"content"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	tpl, err := h.repo.UpdateTemplate(c.Context(), id, body.Title, body.StatusTarget, body.Content)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.WriteError(c, httpx.NotFound("not_found", "Template tidak ditemukan."))
		}
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memperbarui template."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": tpl})
}

// DeleteTemplate menangani DELETE /api/v1/admin/templates/:id.
func (h *Handler) DeleteTemplate(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_id", "ID template tidak valid."))
	}

	if err := h.repo.DeleteTemplate(c.Context(), id); err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.WriteError(c, httpx.NotFound("not_found", "Template tidak ditemukan."))
		}
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal menghapus template."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}
