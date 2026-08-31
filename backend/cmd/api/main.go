package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"
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

	app := server.New(server.Deps{Cfg: cfg, Log: log, DB: db})

	addr := cfg.Host + ":" + cfg.Port

	go func() {
		log.Info("server fiber v3 berjalan", "addr", addr)
		if err := app.Listen(addr, fiber.ListenConfig{
			DisableStartupMessage: true,
		}); err != nil {
			log.Error("server error", "error", err)
		}
	}()

	<-ctx.Done()
	log.Info("mematikan server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Error("gagal shutdown", "error", err)
	}
	log.Info("server berhenti")
}