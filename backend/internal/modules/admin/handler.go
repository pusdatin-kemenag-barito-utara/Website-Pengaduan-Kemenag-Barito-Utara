package admin

import (
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/storage"
)

// Handler menangani endpoint admin.
type Handler struct {
	repo    *Repository
	storage *storage.Client
	log     *slog.Logger
}

// NewHandler membuat Handler admin.
func NewHandler(repo *Repository, st *storage.Client, log *slog.Logger) *Handler {
	return &Handler{repo: repo, storage: st, log: log}
}

// Register memasang rute admin pengaduan (relatif terhadap grup /admin).
func (h *Handler) Register(r fiber.Router) {
	// Pengaduan
	r.Get("/pengaduan", h.List)
	r.Get("/pengaduan/stats", h.Stats)
	r.Get("/pengaduan/:ticket/file", h.FileRedirect)
	r.Post("/pengaduan/cleanup-storage", h.CleanupStorage)
	r.Patch("/pengaduan/:ticket", h.Update)
	r.Delete("/pengaduan/:ticket", h.Delete)

	// Ulasan & IKM
	r.Get("/ratings", h.ListRatings)

	// Template Tanggapan
	r.Get("/templates", h.ListTemplates)
	r.Post("/templates", h.CreateTemplate)
	r.Patch("/templates/:id", h.UpdateTemplate)
	r.Delete("/templates/:id", h.DeleteTemplate)

	// Pengaturan Sistem
	r.Get("/settings", h.GetSettings)
	r.Post("/settings", h.UpdateSettings)

	// Rekap Laporan
	r.Get("/reports/summary", h.GetReportSummary)
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