package admin

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/storage"
)

// Handler menangani endpoint admin pengaduan.
type Handler struct {
	repo    *Repository
	storage *storage.Client
	log     *slog.Logger
}

// NewHandler membuat Handler admin pengaduan.
func NewHandler(repo *Repository, st *storage.Client, log *slog.Logger) *Handler {
	return &Handler{repo: repo, storage: st, log: log}
}

// Register memasang rute admin pengaduan (relatif terhadap grup /admin).
func (h *Handler) Register(r chi.Router) {
	r.Get("/pengaduan", h.List)
	r.Get("/pengaduan/stats", h.Stats)
	r.Patch("/pengaduan/{ticket}", h.Update)
	r.Delete("/pengaduan/{ticket}", h.Delete)
}

// List menangani GET /api/v1/admin/pengaduan.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(r.URL.Query().Get("per_page"))
	if perPage < 1 || perPage > 1000 {
		perPage = 20
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	category := strings.TrimSpace(r.URL.Query().Get("category"))
	if status != "" && !validate.Status(status) {
		httpx.WriteError(w, httpx.BadRequest("invalid_status", "Status filter tidak valid."))
		return
	}
	if category != "" && !validate.Category(category) {
		httpx.WriteError(w, httpx.BadRequest("invalid_category", "Kategori filter tidak valid."))
		return
	}

	res, err := h.repo.List(r.Context(), ListFilter{
		Status:   status,
		Category: category,
		Search:   strings.TrimSpace(r.URL.Query().Get("search")),
		Page:     page,
		PerPage:  perPage,
	})
	if err != nil {
		h.log.Error("list pengaduan gagal", "error", err)
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memuat daftar pengaduan."))
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true, "data": res})
}

// Update menangani PATCH /api/v1/admin/pengaduan/{ticket}.
func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	ticket := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "ticket")))
	if !validate.TicketFormat(ticket) {
		httpx.WriteError(w, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
		return
	}

	var body struct {
		Status        *string `json:"status"`
		AdminResponse *string `json:"admin_response"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
		return
	}

	if body.Status == nil && body.AdminResponse == nil {
		httpx.WriteError(w, httpx.BadRequest("empty_update", "Tidak ada perubahan yang dikirim."))
		return
	}

	var status string
	if body.Status != nil {
		if !validate.Status(*body.Status) {
			httpx.WriteError(w, httpx.BadRequest("invalid_status", "Status tidak valid."))
			return
		}
		status = *body.Status
	} else {
		status = "" // tak diubah; query memakai CASE.
	}

	if body.AdminResponse != nil && len([]rune(*body.AdminResponse)) > 10000 {
		httpx.WriteError(w, httpx.BadRequest("invalid_response", "Tanggapan maksimal 10.000 karakter."))
		return
	}

	if err := h.repo.UpdateStatusAndResponse(r.Context(), ticket, status, body.AdminResponse); err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.WriteError(w, httpx.NotFound("not_found", "Pengaduan tidak ditemukan."))
			return
		}
		h.log.Error("update pengaduan gagal", "ticket", ticket, "error", err)
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memperbarui pengaduan."))
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Pengaduan berhasil diperbarui.",
	})
}

// Delete menangani DELETE /api/v1/admin/pengaduan/{ticket}.
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {
	ticket := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "ticket")))
	if !validate.TicketFormat(ticket) {
		httpx.WriteError(w, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
		return
	}

	fileKey, err := h.repo.Delete(r.Context(), ticket)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.WriteError(w, httpx.NotFound("not_found", "Pengaduan tidak ditemukan."))
			return
		}
		h.log.Error("hapus pengaduan gagal", "ticket", ticket, "error", err)
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal menghapus pengaduan."))
		return
	}

	// Hapus lampiran R2 bila ada (gagal hanya dilog, baris tetap terhapus).
	if fileKey != nil && h.storage.Enabled() {
		key := strings.TrimPrefix(*fileKey, "r2:")
		if err := h.storage.Delete(r.Context(), key); err != nil {
			h.log.Warn("hapus objek R2 gagal", "key", key, "error", err)
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// Stats menangani GET /api/v1/admin/pengaduan/stats.
func (h *Handler) Stats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var byStatus map[string]int
	if err := h.scanMap(ctx, `
		SELECT status, count(*) FROM `+h.repo.table+` GROUP BY status`, &byStatus); err != nil {
		h.log.Error("stats status gagal", "error", err)
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memuat statistik."))
		return
	}

	var byCategory map[string]int
	if err := h.scanMap(ctx, `
		SELECT category, count(*) FROM `+h.repo.table+` GROUP BY category`, &byCategory); err != nil {
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memuat statistik."))
		return
	}

	var byDay []map[string]any
	rows, err := h.repo.pool.Query(ctx, `
		SELECT to_char(created_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') AS day, count(*)
		FROM `+h.repo.table+`
		WHERE created_at > NOW() - INTERVAL '30 days'
		GROUP BY day ORDER BY day`)
	if err != nil {
		httpx.WriteError(w, httpx.Internal("db_error", "Gagal memuat statistik."))
		return
	}
	defer rows.Close()
	for rows.Next() {
		var day string
		var n int
		if err := rows.Scan(&day, &n); err != nil {
			continue
		}
		byDay = append(byDay, map[string]any{"date": day, "count": n})
	}

	var total int
	_ = h.repo.pool.QueryRow(ctx,
		`SELECT count(*) FROM `+h.repo.table).Scan(&total)

	var avgRating *float64
	_ = h.repo.pool.QueryRow(ctx,
		`SELECT AVG(rating) FROM `+h.repo.table+` WHERE rating IS NOT NULL`).Scan(&avgRating)

	httpx.JSON(w, http.StatusOK, map[string]any{
		"success": true,
		"data": map[string]any{
			"total":          total,
			"by_status":      byStatus,
			"by_category":    byCategory,
			"last_30_days":   byDay,
			"avg_rating":     roundPtr(avgRating, 2),
			"generated_at":   time.Now().Format(time.RFC3339),
		},
	})
}

// scanMap membaca pasangan kolom string->int menjadi map.
func (h *Handler) scanMap(ctx context.Context, query string, out *map[string]int) error {
	rows, err := h.repo.pool.Query(ctx, query)
	if err != nil {
		return err
	}
	defer rows.Close()

	*out = map[string]int{}
	for rows.Next() {
		var k string
		var v int
		if err := rows.Scan(&k, &v); err != nil {
			return err
		}
		(*out)[k] = v
	}
	return rows.Err()
}

func roundPtr(p *float64, decimals int) *float64 {
	if p == nil {
		return nil
	}
	mult := 1.0
	for i := 0; i < decimals; i++ {
		mult *= 10
	}
	v := float64(int64(*p*mult+0.5)) / mult
	return &v
}