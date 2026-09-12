package auth

import (
	"context"
	"testing"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
)

func TestHashToken(t *testing.T) {
	h1 := hashToken("token123")
	h2 := hashToken("token123")
	h3 := hashToken("token456")

	if h1 == "" || len(h1) != 64 {
		t.Fatalf("hashToken format tidak valid: %s", h1)
	}
	if h1 != h2 {
		t.Fatalf("hashToken harus deterministik: %s != %s", h1, h2)
	}
	if h1 == h3 {
		t.Fatalf("hashToken input berbeda harus menghasilkan hash berbeda: %s == %s", h1, h3)
	}
}

func TestVerifyCredentials(t *testing.T) {
	cfg := &config.Config{
		AdminEmail:    "admin@kemenag.go.id",
		AdminPassword: "MockSecretPassword123!",
		AdminName:     "Test Administrator",
	}

	svc := &Service{cfg: cfg}

	// 1. Email lengkap valid
	if !svc.verifyCredentials("admin@kemenag.go.id", "MockSecretPassword123!") {
		t.Fatal("email lengkap valid harus berhasil")
	}

	// 2. Prefix username valid
	if !svc.verifyCredentials("admin", "MockSecretPassword123!") {
		t.Fatal("prefix username valid harus berhasil")
	}

	// 3. Alias valid
	if !svc.verifyCredentials("superadmin", "MockSecretPassword123!") {
		t.Fatal("alias superadmin harus berhasil")
	}

	// 4. Case-insensitivity email
	if !svc.verifyCredentials("Admin@Kemenag.GO.ID", "MockSecretPassword123!") {
		t.Fatal("email huruf besar harus berhasil")
	}

	// 5. Password salah
	if svc.verifyCredentials("admin@kemenag.go.id", "salah123") {
		t.Fatal("password salah tidak boleh berhasil")
	}

	// 6. Username salah
	if svc.verifyCredentials("orang_asing@gmail.com", "MockSecretPassword123!") {
		t.Fatal("username tidak dikenal tidak boleh berhasil")
	}
}

func TestAuthValidation(t *testing.T) {
	cfg := &config.Config{
		AdminEmail:      "admin@kemenag.go.id",
		AdminPassword:   "MockSecretPassword123!",
		AdminName:       "Test Administrator",
		SessionTTLHours: 24,
	}

	svc := &Service{
		cfg:       cfg,
		ipLimiter: ratelimit.New(10, time.Minute),
	}

	ctx := context.Background()

	// 1. Empty username
	_, err := svc.Login(ctx, "", "MockSecretPassword123!", "127.0.0.1")
	if err == nil {
		t.Fatal("harus gagal saat username kosong")
	}

	// 2. Empty password
	_, err = svc.Login(ctx, "admin@kemenag.go.id", "", "127.0.0.1")
	if err == nil {
		t.Fatal("harus gagal saat password kosong")
	}
}
