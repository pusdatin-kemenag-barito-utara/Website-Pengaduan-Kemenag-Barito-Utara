package config

import (
	"os"
	"path/filepath"
	"testing"
)

// TestLoadFromMonorepoRoot memastikan .env.local di root monorepo (parent dir)
// terbaca saat proses berjalan dari dalam direktori backend.
func TestLoadFromMonorepoRoot(t *testing.T) {
	root := monorepoRoot(t)
	envFile := filepath.Join(root, ".env.local")
	if _, err := os.Stat(envFile); err != nil {
		t.Skipf("root .env.local tidak ada (%v)", err)
	}

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.DatabaseURL == "" {
		t.Error("DATABASE_URL kosong — .env.local root tidak terbaca")
	}
	if cfg.SessionSecret == "" {
		t.Error("SESSION_SECRET kosong")
	}
	if cfg.PublicSiteURL != "http://localhost:3000" {
		t.Errorf("PublicSiteURL = %q, want http://localhost:3000", cfg.PublicSiteURL)
	}
}

func TestLoadFromEnvironment(t *testing.T) {
	t.Setenv("SESSION_SECRET", "mock-session-secret-for-test")
	t.Setenv("SUPER_ADMIN_PASSWORD", "mock-admin-password")
	t.Setenv("SUPER_ADMIN_EMAIL", "mock-admin@kemenag.go.id")
	t.Setenv("PUBLIC_SITE_URL", "https://pengaduan.kemenag-baritoutara.com")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.SessionSecret != "mock-session-secret-for-test" {
		t.Errorf("SessionSecret = %q, want mock-session-secret-for-test", cfg.SessionSecret)
	}
	if cfg.AdminEmail != "mock-admin@kemenag.go.id" {
		t.Errorf("AdminEmail = %q, want mock-admin@kemenag.go.id", cfg.AdminEmail)
	}
	if cfg.PublicSiteURL != "https://pengaduan.kemenag-baritoutara.com" {
		t.Errorf("PublicSiteURL = %q, want https://pengaduan.kemenag-baritoutara.com", cfg.PublicSiteURL)
	}
}

func monorepoRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for i := 0; i < 6; i++ {
		if _, err := os.Stat(filepath.Join(dir, ".git")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	t.Fatal("root monorepo tidak ditemukan")
	return ""
}
