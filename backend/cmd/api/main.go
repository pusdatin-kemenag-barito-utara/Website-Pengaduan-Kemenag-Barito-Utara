package main


import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/logger"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/server"
)

func main() {
	log := logger.New()

	cfg, err := config.Load()
	if err != nil {
		log.Error("konfigurasi tidak valid", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Koneksi database (opsional saat pengembangan tanpa DATABASE_URL).
	var db *database.DB
	if cfg.DatabaseURL != "" {
		for attempt := 1; attempt <= 5; attempt++ {
			connectCtx, connectCancel := context.WithTimeout(ctx, 5*time.Second)
			db, err = database.Connect(connectCtx, cfg.DatabaseURL, cfg.AppSchema)
			connectCancel()
			if err == nil {
				break
			}
			log.Warn("percobaan koneksi database gagal, mencoba lagi...", "attempt", attempt, "error", err)
			time.Sleep(2 * time.Second)
		}
		if err != nil {
			log.Error("gagal koneksi database setelah 5 percobaan", "error", err)
			os.Exit(1)
		}
		defer db.Close()

		if err := db.Migrate(ctx); err != nil {
			log.Error("gagal menjalankan migrasi", "error", err)
			os.Exit(1)
		}
		log.Info("migrasi database selesai", "schema", cfg.AppSchema)
	} else {
		log.Warn("DATABASE_URL kosong — berjalan tanpa database (health = degraded)")
	}

	handler := server.New(server.Deps{Cfg: cfg, Log: log, DB: db})

	srv := &http.Server{
		Addr:              cfg.Host + ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		log.Info("server berjalan", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	log.Info("mematikan server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Error("gagal shutdown", "error", err)
	}
	log.Info("server berhenti")
}