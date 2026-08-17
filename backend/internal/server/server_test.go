package server

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
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
	h := New(Deps{Cfg: testCfg(), Log: testLog(), DB: nil})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
	var body struct {
		Status   string `json:"status"`
		Database struct {
			Connected bool `json:"connected"`
		} `json:"database"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Status != "degraded" || body.Database.Connected {
		t.Fatalf("harus degraded & disconnected: %+v", body)
	}
}

func TestNotFoundJSON(t *testing.T) {
	h := New(Deps{Cfg: testCfg(), Log: testLog(), DB: nil})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/tidak-ada", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Fatalf("content-type = %q", ct)
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

	h := New(Deps{Cfg: cfg, Log: testLog(), DB: db})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", rec.Code, rec.Body.String())
	}
}