package layanan

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
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
func (h *Handler) RegisterPublic(r chi.Router) {
	r.Get("/layanan", h.ListPublic)
}

// RegisterAdmin memasang rute layanan admin (di bawah grup /admin).
func (h *Handler) RegisterAdmin(r chi.Router) {
	r.Route("/layanan", func(admin chi.Router) {
		admin.Get("/", h.ListAll)
		admin.Post("/", h.Create)
		admin.Put("/reorder", h.Reorder)
		admin.Patch("/{id}", h.Update)
		admin.Delete("/{id}", h.Delete)
	})
}

// ListPublic menangani GET /api/v1/layanan.
func (h *Handler) ListPublic(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.ListActive(r.Context())
	if err != nil {
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memuat daftar layanan."))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true, "data": items})
}

// ListAll menangani GET /api/v1/admin/layanan.
func (h *Handler) ListAll(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.ListAll(r.Context())
	if err != nil {
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memuat daftar layanan."))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true, "data": items})
}

// Create menangani POST /api/v1/admin/layanan.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
		return
	}

	name := Normalize(body.Name)
	if name == "" || !validate.InRange(name, 1, 150) {
		httpx.WriteError(w, httpx.BadRequest("invalid_name", "Nama layanan wajib diisi (maks. 150 karakter)."))
		return
	}

	active := true
	if body.IsActive != nil {
		active = *body.IsActive
	}

	l := &Layanan{Name: name, Description: body.Description, IsActive: active}
	if err := h.repo.Create(r.Context(), l); err != nil {
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal menyimpan layanan."))
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"success": true, "data": l})
}

// Update menangani PATCH /api/v1/admin/layanan/{id}.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_id", "ID layanan tidak valid."))
		return
	}

	existing, err := h.repo.FindByID(r.Context(), id)
	if err != nil {
		httpx.WriteError(w, notFoundOrInternal(err))
		return
	}

	var body struct {
		Name        *string `json:"name"`
		Description *string `json:"description"`
		IsActive    *bool   `json:"is_active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
		return
	}

	if body.Name != nil {
		name := Normalize(*body.Name)
		if name == "" || !validate.InRange(name, 1, 150) {
			httpx.WriteError(w, httpx.BadRequest("invalid_name", "Nama layanan wajib diisi (maks. 150 karakter)."))
			return
		}
		existing.Name = name
	}
	if body.Description != nil {
		existing.Description = body.Description
	}
	if body.IsActive != nil {
		existing.IsActive = *body.IsActive
	}

	if err := h.repo.Update(r.Context(), existing); err != nil {
		httpx.WriteError(w, notFoundOrInternal(err))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true, "data": existing})
}

// Delete menangani DELETE /api/v1/admin/layanan/{id}.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_id", "ID layanan tidak valid."))
		return
	}
	if err := h.repo.Delete(r.Context(), id); err != nil {
		httpx.WriteError(w, notFoundOrInternal(err))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// Reorder menangani PUT /api/v1/admin/layanan/reorder.
func (h *Handler) Reorder(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Ids []uuid.UUID `json:"ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
		return
	}
	if len(body.Ids) == 0 {
		httpx.WriteError(w, httpx.BadRequest("invalid_ids", "Daftar urutan tidak boleh kosong."))
		return
	}
	if err := h.repo.Reorder(r.Context(), body.Ids); err != nil {
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal menyimpan urutan layanan."))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func notFoundOrInternal(err error) error {
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound("not_found", "Layanan tidak ditemukan.")
	}
	return httpx.Internal("db_error", "Operasi pada layanan gagal.")
}