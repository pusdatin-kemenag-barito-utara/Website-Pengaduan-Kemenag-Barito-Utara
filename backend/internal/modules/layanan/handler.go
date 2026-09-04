package layanan

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// Handler menangani endpoint layanan (publik & admin).
type Handler struct {
	repo *Repository
}

// NewHandler membuat Handler layanan.
func NewHandler(repo *Repository) *Handler { return &Handler{repo: repo} }

// RegisterPublic memasang rute layanan publik.
func (h *Handler) RegisterPublic(r fiber.Router) {
	r.Get("/layanan", h.ListPublic)
}

// RegisterAdmin memasang rute layanan admin.
func (h *Handler) RegisterAdmin(r fiber.Router) {
	admin := r.Group("/layanan")
	admin.Get("/", h.ListAll)
	admin.Post("/", h.Create)
	admin.Put("/reorder", h.Reorder)
	admin.Patch("/:id", h.Update)
	admin.Delete("/:id", h.Delete)
}

// ListPublic menangani GET /api/v1/layanan (100% dinamis dari database).
func (h *Handler) ListPublic(c fiber.Ctx) error {
	items, err := h.repo.ListActive(c.Context())
	if err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat daftar layanan."))
	}
	if items == nil {
		items = []Layanan{}
	}
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": items})
}

// ListAll menangani GET /api/v1/admin/layanan.
func (h *Handler) ListAll(c fiber.Ctx) error {
	items, err := h.repo.ListAll(c.Context())
	if err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat daftar layanan."))
	}
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("Pragma", "no-cache")
	c.Set("Expires", "0")
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": items})
}

// Create menangani POST /api/v1/admin/layanan.
func (h *Handler) Create(c fiber.Ctx) error {
	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	name := Normalize(body.Name)
	if name == "" || !validate.InRange(name, 1, 150) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_name", "Nama layanan wajib diisi (maks. 150 karakter)."))
	}

	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}

	l := &Layanan{Name: name, Description: body.Description, IsActive: active}
	if err := h.repo.Create(c.Context(), l); err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal menyimpan layanan."))
	}
	return httpx.JSON(c, fiber.StatusCreated, fiber.Map{"success": true, "data": l})
}

// Update menangani PATCH /api/v1/admin/layanan/:id.
func (h *Handler) Update(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_id", "ID layanan tidak valid."))
	}

	existing, err := h.repo.FindByID(c.Context(), id)
	if err != nil {
		return httpx.WriteError(c, notFoundOrInternal(err))
	}

	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	if body.Name != nil {
		name := Normalize(*body.Name)
		if name == "" || !validate.InRange(name, 1, 150) {
			return httpx.WriteError(c, httpx.BadRequest("invalid_name", "Nama layanan wajib diisi (maks. 150 karakter)."))
		}
		existing.Name = name
	}
	if body.Description != nil {
		existing.Description = body.Description
	}
	if body.IsActive != nil {
		existing.IsActive = *body.IsActive
	}

	if err := h.repo.Update(c.Context(), existing); err != nil {
		return httpx.WriteError(c, notFoundOrInternal(err))
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": existing})
}

// Delete menangani DELETE /api/v1/admin/layanan/:id.
func (h *Handler) Delete(c fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_id", "ID layanan tidak valid."))
	}
	if err := h.repo.Delete(c.Context(), id); err != nil {
		return httpx.WriteError(c, notFoundOrInternal(err))
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// Reorder menangani PUT /api/v1/admin/layanan/reorder.
func (h *Handler) Reorder(c fiber.Ctx) error {
	var body struct {
		Ids []uuid.UUID `json:"ids"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}
	if len(body.Ids) == 0 {
		return httpx.WriteError(c, httpx.BadRequest("invalid_ids", "Daftar urutan tidak boleh kosong."))
	}
	if err := h.repo.Reorder(c.Context(), body.Ids); err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal menyimpan urutan layanan."))
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

func notFoundOrInternal(err error) error {
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound("not_found", "Layanan tidak ditemukan.")
	}
	return httpx.Internal("db_error", "Operasi pada layanan gagal.")
}