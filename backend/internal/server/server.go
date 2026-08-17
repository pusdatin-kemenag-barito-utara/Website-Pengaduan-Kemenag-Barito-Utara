package server

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
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

// New membangun router HTTP lengkap.
func New(deps Deps) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.Recoverer(deps.Log))
	r.Use(middleware.AccessLog(deps.Log))

	r.NotFound(func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusNotFound, map[string]any{
			"success": false, "error": "not_found", "message": "Endpoint tidak ditemukan.",
		})
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusMethodNotAllowed, map[string]any{
			"success": false, "error": "method_not_allowed", "message": "Metode tidak diizinkan.",
		})
	})

	r.Route("/api/v1", func(api chi.Router) {
		api.Use(chimw.RealIP)

		health.New(deps.Cfg, deps.DB, deps.Log, Version).Register(api)

		if deps.DB == nil {
			return
		}

		storageClient := storage.NewR2(
			deps.Cfg.R2AccessKeyID, deps.Cfg.R2SecretAccessKey,
			deps.Cfg.R2EndpointURL, deps.Cfg.R2BucketPengaduan,
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

		authSvc := auth.NewService(deps.DB.Pool, deps.Cfg, deps.Log, deps.Cfg.AppSchema)
		authHandler := auth.NewHandler(authSvc, deps.Cfg, deps.Log)
		authHandler.Register(api)

		// Rute admin wajib lewat RequireAdmin (perbaikan audit K1/K2).
		api.Route("/admin", func(adminApi chi.Router) {
			adminApi.Use(authHandler.RequireAdmin)
			authHandler.RegisterAdmin(adminApi)
			layananHandler.RegisterAdmin(adminApi)
			admin.NewHandler(
				admin.NewRepository(deps.DB.Pool, deps.Cfg.AppSchema, deps.Log),
				storageClient, deps.Log,
			).Register(adminApi)
		})
	})

	return r
}