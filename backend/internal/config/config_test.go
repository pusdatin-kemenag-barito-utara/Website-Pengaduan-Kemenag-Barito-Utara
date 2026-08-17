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
