// Package auth menangani autentikasi super_admin mandiri:
// 1. Verifikasi kredensial langsung terhadap konfigurasi super_admin (tanpa dependensi eksternal),
// 2. Proteksi brute-force & lockout per IP via koleksi login_attempts di PocketBase,
// 3. Sesi server-side dengan cookie HttpOnly (hash SHA-256 di koleksi sessions).
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
)

// LoginAttempts lockout: 5 gagal → kunci 15 menit.
const (
	maxLoginAttempts = 5
	lockoutDuration  = 15 * time.Minute
)

var (
	// ErrInvalidCredentials dipakai agar error login seragam (anti user enumeration).
	ErrInvalidCredentials = errors.New("email atau password salah")
)

// LoginAttempt merepresentasikan catatan percobaan login per IP.
type LoginAttempt struct {
	ID           string           `json:"id"`
	IPAddress    string           `json:"ip_address"`
	AttemptCount int              `json:"attempt_count"`
	LastAttempt  database.PBTime  `json:"last_attempt"`
	LockoutUntil *database.PBTime `json:"lockout_until"`
}

// SessionRecord merepresentasikan catatan sesi di PocketBase.
type SessionRecord struct {
	ID         string          `json:"id"`
	TokenHash  string          `json:"token_hash"`
	AdminEmail string          `json:"admin_email"`
	Role       string          `json:"role"`
	ExpiresAt  database.PBTime `json:"expires_at"`
}

// Service memuat logika autentikasi & sesi super_admin mandiri.
type Service struct {
	db        *database.DB
	cfg       *config.Config
	log       *slog.Logger
	ipLimiter *ratelimit.Limiter
}

// NewService membuat Service auth mandiri.
func NewService(db *database.DB, cfg *config.Config, log *slog.Logger) *Service {
	return &Service{
		db:        db,
		cfg:       cfg,
		log:       log,
		ipLimiter: ratelimit.New(10, time.Minute),
	}
}

// Session adalah data sesi super_admin aktif.
type Session struct {
	Token      string
	TokenHash  string
	AdminEmail string
	Role       string
	Name       string
	ExpiresAt  time.Time
}

// Login memverifikasi kredensial super_admin, memeriksa lockout IP,
// lalu membuat sesi. Mengembalikan token sesi (nilai cookie).
func (s *Service) Login(ctx context.Context, usernameOrEmail, password, ip string) (*Session, error) {
	inputUser := strings.ToLower(strings.TrimSpace(usernameOrEmail))
	password = strings.TrimSpace(password)

	if inputUser == "" || password == "" {
		go s.recordFailure(context.Background(), ip)
		return nil, httpx.Unauthorized("invalid_credentials", "Email atau kata sandi salah.")
	}

	if ok, _ := s.ipLimiter.Allow("login:" + ip); !ok {
		return nil, httpx.TooManyRequests("rate_limited", "Terlalu banyak percobaan login. Coba lagi nanti.")
	}

	// 1) Cek status lockout IP pada database
	locked, wait, errLockout := s.checkLockout(ctx, ip)
	if errLockout != nil {
		s.log.Error("gagal periksa status lockout login", "error", errLockout)
		return nil, httpx.Internal("db_error", "Gagal memeriksa status login.")
	}
	if locked {
		return nil, httpx.TooManyRequests("locked",
			fmt.Sprintf("Terlalu banyak percobaan. Coba lagi dalam %d menit.", int(wait.Minutes())+1))
	}

	// 2) Verifikasi kredensial super_admin mandiri
	if !s.verifyCredentials(inputUser, password) {
		if s.log != nil {
			s.log.Warn("percobaan login super_admin gagal", "user", inputUser, "ip", ip)
		}
		go s.recordFailure(context.Background(), ip)
		return nil, httpx.Unauthorized("invalid_credentials", "Email atau kata sandi salah.")
	}

	// 3) Reset attempts di background saat login berhasil
	go s.resetAttempts(context.Background(), ip)

	// 4) Terbitkan token sesi acak aman; simpan hash SHA-256 di database
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, httpx.Internal("internal_error", "Gagal membuat sesi.")
	}
	token := hex.EncodeToString(raw)
	expires := time.Now().Add(time.Duration(s.cfg.SessionTTLHours) * time.Hour)

	adminEmail := s.cfg.AdminEmail
	adminName := s.cfg.AdminName
	if adminName == "" {
		adminName = "Super Admin"
	}
	role := "super_admin"

	if s.db != nil {
		sessRec := map[string]any{
			"token_hash":  hashToken(token),
			"admin_email": adminEmail,
			"role":        role,
			"expires_at":  expires.Format(time.RFC3339),
		}
		if _, err := database.CreateRecord[SessionRecord](ctx, s.db, "sessions", sessRec); err != nil {
			s.log.Error("insert session gagal", "error", err)
			return nil, httpx.Internal("db_error", "Gagal membuat sesi.")
		}
		go s.purgeExpiredSessions(context.Background())
	}

	return &Session{
		Token:      token,
		AdminEmail: adminEmail,
		Role:       role,
		Name:       adminName,
		ExpiresAt:  expires,
	}, nil
}

// Lookup memvalidasi token sesi dan mengembalikan data super_admin.
func (s *Service) Lookup(ctx context.Context, token string) (*Session, error) {
	if token == "" || s.db == nil {
		return nil, ErrInvalidCredentials
	}

	h := hashToken(token)
	rec, err := database.FindFirst[SessionRecord](ctx, s.db, "sessions", fmt.Sprintf("token_hash = '%s'", h))
	if err != nil || rec == nil {
		return nil, ErrInvalidCredentials
	}

	if time.Now().After(rec.ExpiresAt.Time()) {
		_ = database.DeleteRecord(ctx, s.db, "sessions", rec.ID)
		return nil, ErrInvalidCredentials
	}

	name := s.cfg.AdminName
	if name == "" {
		name = "Super Admin"
	}
	role := rec.Role
	if role == "" {
		role = "super_admin"
	}

	return &Session{
		Token:      token,
		TokenHash:  rec.TokenHash,
		AdminEmail: rec.AdminEmail,
		Role:       role,
		Name:       name,
		ExpiresAt:  rec.ExpiresAt.Time(),
	}, nil
}

// Logout menghapus sesi.
func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" || s.db == nil {
		return nil
	}
	h := hashToken(token)
	rec, err := database.FindFirst[SessionRecord](ctx, s.db, "sessions", fmt.Sprintf("token_hash = '%s'", h))
	if err == nil && rec != nil {
		_ = database.DeleteRecord(ctx, s.db, "sessions", rec.ID)
	}
	return nil
}

// checkLockout membaca koleksi login_attempts untuk IP.
func (s *Service) checkLockout(ctx context.Context, ip string) (bool, time.Duration, error) {
	if s.db == nil {
		return false, 0, nil
	}
	rec, err := database.FindFirst[LoginAttempt](ctx, s.db, "login_attempts", fmt.Sprintf("ip_address = '%s'", ip))
	if err != nil || rec == nil {
		return false, 0, nil
	}
	if rec.LockoutUntil != nil && rec.LockoutUntil.Time().After(time.Now()) {
		wait := time.Until(rec.LockoutUntil.Time())
		return true, wait, nil
	}
	return false, 0, nil
}

// recordFailure mencatat kegagalan login dan memberlakukan lockout jika batas tercapai.
func (s *Service) recordFailure(ctx context.Context, ip string) {
	if s.db == nil {
		return
	}
	rec, err := database.FindFirst[LoginAttempt](ctx, s.db, "login_attempts", fmt.Sprintf("ip_address = '%s'", ip))
	now := time.Now()
	if err == nil && rec != nil {
		count := rec.AttemptCount + 1
		update := map[string]any{
			"attempt_count": count,
			"last_attempt":  now.Format(time.RFC3339),
		}
		if count >= maxLoginAttempts {
			update["lockout_until"] = now.Add(lockoutDuration).Format(time.RFC3339)
		}
		_, _ = database.UpdateRecord[LoginAttempt](ctx, s.db, "login_attempts", rec.ID, update)
	} else {
		_, _ = database.CreateRecord[LoginAttempt](ctx, s.db, "login_attempts", map[string]any{
			"ip_address":    ip,
			"attempt_count": 1,
			"last_attempt":  now.Format(time.RFC3339),
		})
	}
}

// resetAttempts menghapus riwayat kegagalan login untuk IP tertentu setelah berhasil login.
func (s *Service) resetAttempts(ctx context.Context, ip string) {
	if s.db == nil {
		return
	}
	rec, err := database.FindFirst[LoginAttempt](ctx, s.db, "login_attempts", fmt.Sprintf("ip_address = '%s'", ip))
	if err == nil && rec != nil {
		_ = database.DeleteRecord(ctx, s.db, "login_attempts", rec.ID)
	}
}

// purgeExpiredSessions membersihkan sesi kedaluwarsa di background.
func (s *Service) purgeExpiredSessions(ctx context.Context) {
	if s.db == nil {
		return
	}
	nowStr := time.Now().Format("2006-01-02 15:04:05.000Z")
	filter := fmt.Sprintf("expires_at < '%s'", nowStr)
	expired, err := database.ListRecords[SessionRecord](ctx, s.db, "sessions", 1, 100, filter, "")
	if err == nil && expired != nil {
		for _, sess := range expired.Items {
			_ = database.DeleteRecord(ctx, s.db, "sessions", sess.ID)
		}
	}
}

// verifyCredentials membandingkan kredensial dengan aman terhadap timing attacks.
func (s *Service) verifyCredentials(inputUser, inputPassword string) bool {
	inputUser = strings.ToLower(strings.TrimSpace(inputUser))
	configuredEmail := strings.ToLower(strings.TrimSpace(s.cfg.AdminEmail))
	configuredPassword := strings.TrimSpace(s.cfg.AdminPassword)

	userMatches := subtle.ConstantTimeCompare([]byte(inputUser), []byte(configuredEmail)) == 1

	if !userMatches {
		idx := strings.Index(configuredEmail, "@")
		if idx > 0 {
			usernamePrefix := configuredEmail[:idx]
			if subtle.ConstantTimeCompare([]byte(inputUser), []byte(usernamePrefix)) == 1 {
				userMatches = true
			}
		}
	}

	if !userMatches && (inputUser == "superadmin" || inputUser == "super_admin") {
		userMatches = true
	}

	passMatches := subtle.ConstantTimeCompare([]byte(inputPassword), []byte(configuredPassword)) == 1

	return userMatches && passMatches
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}