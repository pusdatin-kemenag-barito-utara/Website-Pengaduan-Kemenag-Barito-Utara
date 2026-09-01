package health

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

type cachedStatusInfo struct {
	status        string
	isMaintenance bool
	appName       string
	fetchedAt     time.Time
}

// Handler menangani endpoint health check dan sinkronisasi status maintenance Pusdatin.
type Handler struct {
	cfg         *config.Config
	db          *database.DB
	log         *slog.Logger
	version     string
	cacheMu     sync.RWMutex
	cache       cachedStatusInfo
	lastDBPing  time.Time
}

// New membuat Handler health.
func New(cfg *config.Config, db *database.DB, log *slog.Logger, version string) *Handler {
	return &Handler{
		cfg:     cfg,
		db:      db,
		log:     log,
		version: version,
		cache: cachedStatusInfo{
			status:        "online",
			isMaintenance: false,
			appName:       "Pengaduan SI-GESIT",
		},
	}
}

// Register memasang rute modul health ke router Fiber.
func (h *Handler) Register(r fiber.Router) {
	r.Get("/health", h.Health)
	r.Get("/app-status", h.AppStatus)
}

// AppStatus mengecek status aplikasi terkini (online vs maintenance) yang disinkronkan dengan Pusdatin.
// Dilengkapi In-Memory Cache (TTL 4s) dan Write Throttling untuk mengurangi beban IOPS database.
func (h *Handler) AppStatus(c fiber.Ctx) error {
	h.cacheMu.RLock()
	cached := h.cache
	h.cacheMu.RUnlock()

	// Gunakan cache jika masih baru (< 4 detik)
	if time.Since(cached.fetchedAt) < 4*time.Second && cached.fetchedAt.Unix() > 0 {
		c.Set("Cache-Control", "public, max-age=5, s-maxage=10, stale-while-revalidate=30")
		return httpx.JSON(c, fiber.StatusOK, fiber.Map{
			"success":        true,
			"is_maintenance": cached.isMaintenance,
			"status":         cached.status,
			"app_name":       cached.appName,
			"timestamp":      time.Now().UTC().Format(time.RFC3339),
		})
	}

	status := "online"
	isMaintenance := false
	appName := "Pengaduan SI-GESIT"

	if h.db != nil && h.db.Pool != nil {
		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
		defer cancel()

		var dbStatus, dbName string
		err := h.db.Pool.QueryRow(ctx, `
			SELECT status, name
			FROM kemenag_pusdatin.satellite_apps
			WHERE id = 'si_gesit' OR schema_name = $1
			LIMIT 1`,
			h.cfg.AppSchema,
		).Scan(&dbStatus, &dbName)

		if err == nil {
			if dbName != "" {
				appName = dbName
			}
			dbStatusClean := strings.ToLower(strings.TrimSpace(dbStatus))
			if dbStatusClean == "maintenance" {
				status = "maintenance"
				isMaintenance = true
			} else {
				status = "online"
				isMaintenance = false
			}

			// Simpan ke in-memory cache
			h.cacheMu.Lock()
			h.cache = cachedStatusInfo{
				status:        status,
				isMaintenance: isMaintenance,
				appName:       appName,
				fetchedAt:     time.Now(),
			}

			// Throttled update last_health_check (maksimal 1x per 60 detik)
			shouldUpdateDB := time.Since(h.lastDBPing) >= 60*time.Second
			if shouldUpdateDB {
				h.lastDBPing = time.Now()
			}
			h.cacheMu.Unlock()

			if shouldUpdateDB {
				go func() {
					bgCtx, bgCancel := context.WithTimeout(context.Background(), 3*time.Second)
					defer bgCancel()
					_, _ = h.db.Pool.Exec(bgCtx, `
						UPDATE kemenag_pusdatin.satellite_apps
						SET last_health_check = NOW()
						WHERE id = 'si_gesit' OR schema_name = $1`,
						h.cfg.AppSchema,
					)
				}()
			}
		} else {
			h.log.Debug("info satellite_apps pusdatin dilewati / fallback", "error", err)
		}
	}

	c.Set("Cache-Control", "public, max-age=5, s-maxage=10, stale-while-revalidate=30")
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success":        true,
		"is_maintenance": isMaintenance,
		"status":         status,
		"app_name":       appName,
		"timestamp":      time.Now().UTC().Format(time.RFC3339),
	})
}

// Health menangani endpoint monitoring kesehatan server.
func (h *Handler) Health(c fiber.Ctx) error {
	start := time.Now()

	dbConnected := false
	dbError := ""
	if h.db != nil {
		ctx, cancel := context.WithTimeout(c.Context(), 3*time.Second)
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
	httpStatus := fiber.StatusOK
	if !dbConnected {
		status = "degraded"
		httpStatus = fiber.StatusServiceUnavailable
	}

	return httpx.JSON(c, httpStatus, fiber.Map{
		"status":    status,
		"service":   "SI-GESIT Pengaduan Kemenag Barito Utara",
		"version":   h.version,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"database": fiber.Map{
			"connected": dbConnected,
			"schema":    h.cfg.AppSchema,
			"error":     dbError,
		},
		"latency_ms": latency,
	})
}