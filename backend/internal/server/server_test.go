package server

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

func testLog() *slog.Logger { return slog.New(slog.DiscardHandler) }

func testCfg() *config.Config {
	return &config.Config{
		SessionSecret:   "test-secret",
		AppSchema:       "kemenag-pengaduan",
		PusdatinSchema:  "kemenag_pusdatin",
		CookieSecure:    false,
		SessionTTLHours: 24,
	}
}

func TestHealthWithoutDB(t *testing.T) {
	app := New(Deps{Cfg: testCfg(), Log: testLog(), DB: nil})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if res.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", res.StatusCode)
	}

	bodyBytes, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}

	var body struct {
		Status   string `json:"status"`
		Database struct {
			Connected bool `json:"connected"`
		} `json:"database"`
	}
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		t.Fatal(err)
	}
	if body.Status != "degraded" || body.Database.Connected {
		t.Fatalf("harus degraded & disconnected: %+v", body)
	}
}

func TestNotFoundJSON(t *testing.T) {
	app := New(Deps{Cfg: testCfg(), Log: testLog(), DB: nil})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tidak-ada", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if res.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", res.StatusCode)
	}
	if ct := res.Header.Get("Content-Type"); !strings.Contains(ct, "application/json") {
		t.Fatalf("content-type = %q, want application/json", ct)
	}
}

func TestHealthWithDB(t *testing.T) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL kosong — skip integration test")
	}
	cfg := testCfg()
	cfg.DatabaseURL = dsn
	db, err := database.Connect(t.Context(), dsn, cfg.AppSchema)
	if err != nil {
		t.Fatalf("koneksi DB gagal: %v", err)
	}
	defer db.Close()

	app := New(Deps{Cfg: cfg, Log: testLog(), DB: db})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test error: %v", err)
	}

	if res.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(res.Body)
		t.Fatalf("status = %d, want 200 (body: %s)", res.StatusCode, string(bodyBytes))
	}
}