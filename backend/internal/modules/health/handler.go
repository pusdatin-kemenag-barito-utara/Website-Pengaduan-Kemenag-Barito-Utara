package health

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

// Handler menangani endpoint health check.
type Handler struct {
	cfg     *config.Config
	db      *database.DB
	log     *slog.Logger
	version string
}

// New membuat Handler health.
func New(cfg *config.Config, db *database.DB, log *slog.Logger, version string) *Handler {
	return &Handler{cfg: cfg, db: db, log: log, version: version}
}

// Register memasang rute modul health.
func (h *Handler) Register(r chi.Router) {
	r.Get("/health", h.Health)
}

func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	dbConnected := false
	dbError := ""
	if h.db != nil {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()
		if err := h.db.Ping(ctx); err != nil {
			dbError = err.Error()
		} else {
			dbConnected = true
		}
	} else {
		dbError = "DATABASE_URL belum dikonfigurasi"
	}

	latency := time.Since(start).Milliseconds()

	status := "healthy"
	httpStatus := http.StatusOK
	if !dbConnected {
		status = "degraded"
		httpStatus = http.StatusServiceUnavailable
	}

	httpx.JSON(w, httpStatus, map[string]any{
		"status":    status,
		"service":   "SI-GESIT Pengaduan Kemenag Barito Utara",
		"version":   h.version,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"database": map[string]any{
			"connected": dbConnected,
			"schema":    h.cfg.AppSchema,
			"error":     dbError,
		},
		"latency_ms": latency,
	})
}