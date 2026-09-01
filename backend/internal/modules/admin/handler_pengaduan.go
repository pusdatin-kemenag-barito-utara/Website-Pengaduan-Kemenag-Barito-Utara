package admin

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// List menangani GET /api/v1/admin/pengaduan.
func (h *Handler) List(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	if perPage < 1 || perPage > 1000 {
		perPage = 20
	}

	status := strings.TrimSpace(c.Query("status"))
	category := strings.TrimSpace(c.Query("category"))
	if status != "" && !validate.Status(status) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_status", "Status filter tidak valid."))
	}
	if category != "" && !validate.Category(category) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_category", "Kategori filter tidak valid."))
	}

	res, err := h.repo.List(c.Context(), ListFilter{
		Status:   status,
		Category: category,
		Search:   strings.TrimSpace(c.Query("search")),
		Page:     page,
		PerPage:  perPage,
	})
	if err != nil {
		h.log.Error("list pengaduan gagal", "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat daftar pengaduan."))
	}

	// Presign URL lampiran jika storage R2 aktif
	if h.storage != nil && h.storage.Enabled() {
		for i := range res.Items {
			if res.Items[i].FileKey != nil && *res.Items[i].FileKey != "" {
				key := strings.TrimPrefix(*res.Items[i].FileKey, "r2:")
				if !strings.HasPrefix(key, "http://") && !strings.HasPrefix(key, "https://") {
					url, perr := h.storage.PresignedURL(c.Context(), key, 2*time.Hour)
					if perr != nil {
						h.log.Warn("presign admin file gagal", "key", key, "error", perr)
					} else {
						res.Items[i].FileKey = &url
					}
				}
			}
		}
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": res})
}

// FileRedirect menangani GET /api/v1/admin/pengaduan/:ticket/file.
func (h *Handler) FileRedirect(c fiber.Ctx) error {
	ticket := strings.ToUpper(strings.TrimSpace(c.Params("ticket")))
	if !validate.TicketFormat(ticket) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
	}

	item, err := h.repo.FindByTicket(c.Context(), ticket)
	if errors.Is(err, ErrNotFound) {
		return httpx.WriteError(c, httpx.NotFound("not_found", "Pengaduan tidak ditemukan."))
	}
	if err != nil {
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal mencari data pengaduan."))
	}

	if item.FileKey == nil || *item.FileKey == "" {
		return httpx.WriteError(c, httpx.NotFound("no_file", "Pengaduan ini tidak memiliki lampiran."))
	}

	if h.storage == nil || !h.storage.Enabled() {
		return httpx.WriteError(c, httpx.Internal("storage_unconfigured", "Penyimpanan berkas Cloudflare R2 belum aktif."))
	}

	key := strings.TrimPrefix(*item.FileKey, "r2:")
	url, perr := h.storage.PresignedURL(c.Context(), key, 1*time.Hour)
	if perr != nil {
		h.log.Error("presign gagal", "key", key, "error", perr)
		return httpx.WriteError(c, httpx.Internal("presign_failed", "Gagal membuat tautan unduhan berkas."))
	}

	return c.Redirect().To(url)
}

// Update menangani PATCH /api/v1/admin/pengaduan/:ticket.
func (h *Handler) Update(c fiber.Ctx) error {
	ticket := strings.ToUpper(strings.TrimSpace(c.Params("ticket")))
	if !validate.TicketFormat(ticket) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
	}

	var body struct {
		Status        *string `json:"status"`
		AdminResponse *string `json:"admin_response"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	if body.Status == nil && body.AdminResponse == nil {
		return httpx.WriteError(c, httpx.BadRequest("empty_update", "Tidak ada perubahan yang dikirim."))
	}

	var status string
	if body.Status != nil {
		if !validate.Status(*body.Status) {
			return httpx.WriteError(c, httpx.BadRequest("invalid_status", "Status tidak valid."))
		}
		status = *body.Status
	}

	if body.AdminResponse != nil && len([]rune(*body.AdminResponse)) > 10000 {
		return httpx.WriteError(c, httpx.BadRequest("invalid_response", "Tanggapan maksimal 10.000 karakter."))
	}

	if err := h.repo.UpdateStatusAndResponse(c.Context(), ticket, status, body.AdminResponse); err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.WriteError(c, httpx.NotFound("not_found", "Pengaduan tidak ditemukan."))
		}
		h.log.Error("update pengaduan gagal", "ticket", ticket, "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memperbarui pengaduan."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"message": "Pengaduan berhasil diperbarui.",
	})
}

// Delete menangani DELETE /api/v1/admin/pengaduan/:ticket.
func (h *Handler) Delete(c fiber.Ctx) error {
	ticket := strings.ToUpper(strings.TrimSpace(c.Params("ticket")))
	if !validate.TicketFormat(ticket) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
	}

	fileKey, err := h.repo.Delete(c.Context(), ticket)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.WriteError(c, httpx.NotFound("not_found", "Pengaduan tidak ditemukan."))
		}
		h.log.Error("hapus pengaduan gagal", "ticket", ticket, "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal menghapus pengaduan."))
	}

	// Hapus lampiran R2 bila ada
	if fileKey != nil && *fileKey != "" && h.storage != nil && h.storage.Enabled() {
		key := strings.TrimPrefix(*fileKey, "r2:")
		key = strings.TrimPrefix(key, "/")
		if key != "" {
			if err := h.storage.Delete(c.Context(), key); err != nil {
				h.log.Warn("hapus objek R2 gagal", "key", key, "error", err)
			}
		}
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true})
}

// CleanupStorage menangani POST /api/v1/admin/pengaduan/cleanup-storage.
func (h *Handler) CleanupStorage(c fiber.Ctx) error {
	if h.storage == nil || !h.storage.Enabled() {
		return httpx.WriteError(c, httpx.BadRequest("storage_unconfigured", "Cloudflare R2 belum dikonfigurasi."))
	}

	activeKeys, err := h.repo.GetAllFileKeys(c.Context())
	if err != nil {
		h.log.Error("gagal mengambil active keys dari DB", "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal membaca data pengaduan."))
	}

	activeMap := make(map[string]struct{}, len(activeKeys))
	for _, k := range activeKeys {
		norm := strings.TrimPrefix(k, "r2:")
		norm = strings.TrimPrefix(norm, "/")
		activeMap[norm] = struct{}{}
	}

	allR2Keys, err := h.storage.ListObjects(c.Context(), "pengaduan/")
	if err != nil {
		h.log.Error("gagal list objek R2", "error", err)
		return httpx.WriteError(c, httpx.Internal("r2_list_error", "Gagal memindai objek di Cloudflare R2."))
	}

	var deleted []string
	for _, r2Key := range allR2Keys {
		normR2 := strings.TrimPrefix(r2Key, "/")
		if _, exists := activeMap[normR2]; !exists {
			if err := h.storage.Delete(c.Context(), normR2); err != nil {
				h.log.Warn("gagal hapus orphan file R2", "key", normR2, "error", err)
			} else {
				deleted = append(deleted, normR2)
			}
		}
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Pembersihan Cloudflare R2 selesai. %d file sampah berhasil dihapus.", len(deleted)),
		"data": fiber.Map{
			"deleted_count": len(deleted),
			"deleted_files": deleted,
			"active_count":  len(activeKeys),
			"total_r2":      len(allR2Keys),
		},
	})
}

// Stats menangani GET /api/v1/admin/pengaduan/stats.
func (h *Handler) Stats(c fiber.Ctx) error {
	stats, err := h.repo.GetStats(c.Context())
	if err != nil {
		h.log.Error("stats query gagal", "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat statistik."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"data": fiber.Map{
			"total":        stats.Total,
			"by_status":    stats.ByStatus,
			"by_category":  stats.ByCategory,
			"last_30_days": stats.Last30Days,
			"avg_rating":   roundPtr(stats.AvgRating, 2),
			"generated_at": time.Now().Format(time.RFC3339),
		},
	})
}
