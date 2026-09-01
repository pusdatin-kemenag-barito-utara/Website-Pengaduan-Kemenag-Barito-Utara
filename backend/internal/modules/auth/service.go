// Package auth menangani autentikasi super_admin mandiri:
// 1. Verifikasi kredensial langsung terhadap konfigurasi super_admin (tanpa dependensi eksternal),
// 2. Proteksi brute-force & lockout per IP via tabel lokal login_attempts,
// 3. Sesi server-side dengan cookie HttpOnly (hash SHA-256 di DB sessions).
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

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
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

// Service memuat logika autentikasi & sesi super_admin mandiri.
type Service struct {
	pool      *pgxpool.Pool
	cfg       *config.Config
	log       *slog.Logger
	attempts  string
	sessions  string
	ipLimiter *ratelimit.Limiter
}

// NewService membuat Service auth mandiri. Seluruh tabel tersimpan di skema internal aplikasi.
func NewService(pool *pgxpool.Pool, cfg *config.Config, log *slog.Logger, appSchema string) *Service {
	return &Service{
		pool:      pool,
		cfg:       cfg,
		log:       log,
		attempts:  fmt.Sprintf("%q.%q", appSchema, "login_attempts"),
		sessions:  fmt.Sprintf("%q.%q", appSchema, "sessions"),
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

	// 1) Cek status lockout IP pada database lokal
	locked, wait, errLockout := s.checkLockout(ctx, ip)
	if errLockout != nil {
		s.log.Error("gagal periksa status lockout login", "error", errLockout)
		return nil, httpx.Internal("db_error", "Gagal memeriksa status login.")
	}
	if locked {
		return nil, httpx.TooManyRequests("locked",
			fmt.Sprintf("Terlalu banyak percobaan. Coba lagi dalam %d menit.", int(wait.Minutes())+1))
	}

	// 2) Verifikasi kredensial super_admin mandiri (konfigurasi .env.local)
	if !s.verifyCredentials(inputUser, password) {
		if s.log != nil {
			s.log.Warn("percobaan login super_admin gagal", "user", inputUser, "ip", ip)
		}
		go s.recordFailure(context.Background(), ip)
		return nil, httpx.Unauthorized("invalid_credentials", "Email atau kata sandi salah.")
	}

	// 3) Reset attempts di background saat login berhasil
	go s.resetAttempts(context.Background(), ip)

	// 4) Terbitkan token sesi acak aman; simpan hash SHA-256 di database lokal
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

	if _, err := s.pool.Exec(ctx, fmt.Sprintf(`
		INSERT INTO %s (token_hash, admin_email, role, expires_at)
		VALUES ($1, $2, $3, $4)`, s.sessions),
		hashToken(token), adminEmail, role, expires); err != nil {
		s.log.Error("insert session gagal", "error", err)
		return nil, httpx.Internal("db_error", "Gagal membuat sesi.")
	}

	// Pembersihan sesi kedaluwarsa di background
	go s.purgeExpiredSessions(context.Background())

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
	if token == "" {
		return nil, ErrInvalidCredentials
	}
	var sess Session
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT token_hash, admin_email, role, expires_at
		FROM %s WHERE token_hash = $1 AND expires_at > NOW()`, s.sessions),
		hashToken(token),
	).Scan(&sess.TokenHash, &sess.AdminEmail, &sess.Role, &sess.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, err
	}

	sess.Name = s.cfg.AdminName
	if sess.Name == "" {
		sess.Name = "Super Admin"
	}
	if sess.Role == "" {
		sess.Role = "super_admin"
	}

	return &sess, nil
}

// Logout menghapus sesi.
func (s *Service) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	_, err := s.pool.Exec(ctx,
		`DELETE FROM `+s.sessions+` WHERE token_hash = $1`, hashToken(token))
	return err
}

// checkLockout membaca tabel login_attempts lokal untuk IP.
func (s *Service) checkLockout(ctx context.Context, ip string) (bool, time.Duration, error) {
	if s.pool == nil {
		return false, 0, nil
	}
	var (
		attemptCount int
		lockoutUntil *time.Time
	)
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT attempt_count, lockout_until FROM %s WHERE ip_address = $1`, s.attempts),
		ip,
	).Scan(&attemptCount, &lockoutUntil)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, 0, nil
	}
	if err != nil {
		return false, 0, err
	}
	if lockoutUntil != nil && lockoutUntil.After(time.Now()) {
		return true, time.Until(*lockoutUntil), nil
	}
	return false, 0, nil
}

// recordFailure mencatat percobaan gagal; memicu lockout saat mencapai batas.
func (s *Service) recordFailure(ctx context.Context, ip string) {
	if s.pool == nil {
		return
	}
	var (
		count  int
		lockAt *time.Time
	)
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT attempt_count, lockout_until FROM %s WHERE ip_address = $1`, s.attempts),
		ip,
	).Scan(&count, &lockAt)
	if errors.Is(err, pgx.ErrNoRows) {
		count = 0
	}

	newCount := count + 1
	var newLock *time.Time
	if newCount >= maxLoginAttempts {
		t := time.Now().Add(lockoutDuration)
		newLock = &t
	}

	if errors.Is(err, pgx.ErrNoRows) {
		_, err = s.pool.Exec(ctx, fmt.Sprintf(`
			INSERT INTO %s (ip_address, attempt_count, last_attempt, lockout_until)
			VALUES ($1, $2, NOW(), $3)
			ON CONFLICT (ip_address) DO UPDATE SET
				attempt_count = EXCLUDED.attempt_count,
				last_attempt = NOW(),
				lockout_until = EXCLUDED.lockout_until`, s.attempts),
			ip, newCount, newLock)
	} else {
		_, err = s.pool.Exec(ctx, fmt.Sprintf(`
			UPDATE %s SET attempt_count = $2, last_attempt = NOW(), lockout_until = $3
			WHERE ip_address = $1`, s.attempts),
			ip, newCount, newLock)
	}
	if err != nil && s.log != nil {
		s.log.Error("catat percobaan login gagal", "ip", ip, "error", err)
	}
}

// resetAttempts menghapus catatan percobaan setelah login sukses.
func (s *Service) resetAttempts(ctx context.Context, ip string) {
	if s.pool == nil {
		return
	}
	_, _ = s.pool.Exec(ctx,
		`DELETE FROM `+s.attempts+` WHERE ip_address = $1`, ip)
}

// purgeExpiredSessions membersihkan sesi kedaluwarsa.
func (s *Service) purgeExpiredSessions(ctx context.Context) {
	if s.pool == nil {
		return
	}
	_, _ = s.pool.Exec(ctx, `DELETE FROM `+s.sessions+` WHERE expires_at < NOW()`)
}

// hashToken menghitung SHA-256 token sesi (hanya hash yang disimpan DB).
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// verifyCredentials memverifikasi username/email dan password super_admin.
func (s *Service) verifyCredentials(inputUser, password string) bool {
	if s.cfg == nil || s.cfg.AdminPassword == "" || s.cfg.AdminEmail == "" || password == "" {
		return false
	}
	cleanInput := strings.ToLower(strings.TrimSpace(inputUser))
	validUser := strings.ToLower(strings.TrimSpace(s.cfg.AdminEmail))
	userPrefix := validUser
	if atIdx := strings.Index(validUser, "@"); atIdx != -1 {
		userPrefix = validUser[:atIdx]
	}

	isUserValid := (cleanInput == validUser || cleanInput == userPrefix || cleanInput == "superadmin" || cleanInput == "admin")
	isPassValid := subtle.ConstantTimeCompare([]byte(password), []byte(s.cfg.AdminPassword)) == 1

	return isUserValid && isPassValid
}