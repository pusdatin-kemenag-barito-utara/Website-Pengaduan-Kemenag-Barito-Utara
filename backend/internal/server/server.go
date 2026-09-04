package server

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/modules/admin"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/modules/auth"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/modules/health"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/modules/layanan"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/modules/pengaduan"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/modules/rating"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/middleware"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/turnstile"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/storage"
)

// Version aplikasi (dapat ditimpa via ldflags saat build).
var Version = "0.1.0"

// Deps adalah kumpulan dependensi yang di-wire ke server.
type Deps struct {
	Cfg *config.Config
	Log *slog.Logger
	DB  *database.DB // boleh nil bila DATABASE_URL belum dikonfigurasi
}

// New membangun aplikasi Fiber v3 lengkap.
func New(deps Deps) *fiber.App {
	app := fiber.New(fiber.Config{
		BodyLimit:      6 * 1024 * 1024, // 6 MB untuk lampiran
		ReadBufferSize: 32 * 1024,       // 32 KB untuk header request & cookies besar (anti HTTP 431)
		ErrorHandler: func(c fiber.Ctx, err error) error {
			var appErr *httpx.AppError
			if errors.As(err, &appErr) {
				return c.Status(appErr.Status).JSON(fiber.Map{
					"success": false,
					"error":   appErr.Code,
					"message": appErr.Message,
				})
			}
			var fiberErr *fiber.Error
			if errors.As(err, &fiberErr) {
				return c.Status(fiberErr.Code).JSON(fiber.Map{
					"success": false,
					"error":   "http_error",
					"message": fiberErr.Message,
				})
			}
			deps.Log.Error("unhandled error", "error", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"error":   "internal_error",
				"message": "Terjadi kesalahan pada server.",
			})
		},
	})

	// Middleware global
	app.Use(middleware.RequestID())
	app.Use(middleware.SecurityHeaders())
	app.Use(middleware.Recoverer(deps.Log))
	app.Use(middleware.AccessLog(deps.Log))

	// Health check endpoints
	healthHandler := health.New(deps.Cfg, deps.DB, deps.Log, Version)
	app.Get("/health", healthHandler.Health)
	app.Get("/api/health", healthHandler.Health)

	// API v1 routes
	api := app.Group("/api/v1")
	healthHandler.Register(api)

	if deps.DB != nil {
		storageClient := storage.NewR2(
			deps.Cfg.R2AccessKeyID, deps.Cfg.R2SecretAccessKey,
			deps.Cfg.R2EndpointURL, deps.Cfg.R2BucketPengaduan,
			deps.Cfg.R2PublicURL,
		)
		turnstileVerifier := turnstile.New(deps.Cfg.TurnstileSecretKey)

		pengaduan.NewHandler(
			pengaduan.NewService(pengaduan.NewRepository(deps.DB), deps.Cfg, storageClient, turnstileVerifier, deps.Log),
		).Register(api)

		rating.NewHandler(rating.NewService(deps.DB, deps.Log)).Register(api)

		layananHandler := layanan.NewHandler(
			layanan.NewRepository(deps.DB.Pool, deps.Cfg.AppSchema, deps.Log),
		)
		layananHandler.RegisterPublic(api)

		adminHandler := admin.NewHandler(
			admin.NewRepository(deps.DB.Pool, deps.Cfg.AppSchema, deps.Log),
			storageClient, deps.Log,
		)

		authSvc := auth.NewService(deps.DB.Pool, deps.Cfg, deps.Log, deps.Cfg.AppSchema)
		authHandler := auth.NewHandler(authSvc, deps.Cfg, deps.Log)
		authHandler.Register(api)

		// Rute admin wajib lewat RequireAdmin
		adminApi := api.Group("/admin", authHandler.RequireAdmin)
		authHandler.RegisterAdmin(adminApi)
		layananHandler.RegisterAdmin(adminApi)
		adminHandler.Register(adminApi)
	}

	// 404 handler untuk route yang tidak terdaftar
	app.Use(func(c fiber.Ctx) error {
		return httpx.JSON(c, fiber.StatusNotFound, fiber.Map{
			"success": false,
			"error":   "not_found",
			"message": "Endpoint tidak ditemukan.",
		})
	})

	return app
}