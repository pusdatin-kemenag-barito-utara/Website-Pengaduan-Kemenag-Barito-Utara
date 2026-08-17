// Package auth menangani autentikasi admin:
// 1. Verifikasi kredensial via Supabase Auth (GoTrue),
// 2. Otorisasi via tabel profiles super admin (schema kemenag_pusdatin),
// 3. Sesi server-side dengan cookie HttpOnly (hash SHA-256 di DB).
package auth

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
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
	// ErrNotAdmin menandai akun valid tetapi bukan admin pengaduan.
	ErrNotAdmin = errors.New("akun bukan admin pengaduan")
)

// Service memuat logika autentikasi & sesi admin.
type Service struct {
	pool      *pgxpool.Pool
	cfg       *config.Config
	log       *slog.Logger
	profiles  string
	attempts  string
	sessions  string
	ipLimiter *ratelimit.Limiter
	http      *http.Client
}

// NewService membuat Service auth. Tabel pusdatin diakses lintas schema
// dengan nama yang memenuhi syarat (pooler mengabaikan search_path).
func NewService(pool *pgxpool.Pool, cfg *config.Config, log *slog.Logger, appSchema string) *Service {
	return &Service{
		pool:      pool,
		cfg:       cfg,
		log:       log,
		profiles:  fmt.Sprintf("%q.%q", cfg.PusdatinSchema, "profiles"),
		attempts:  fmt.Sprintf("%q.%q", cfg.PusdatinSchema, "login_attempts"),
		sessions:  fmt.Sprintf("%q.%q", appSchema, "sessions"),
		ipLimiter: ratelimit.New(10, time.Minute),
		http:      &http.Client{Timeout: 10 * time.Second},
	}
}

// Session adalah data sesi admin aktif.
type Session struct {
	Token      string
	TokenHash  string
	AdminEmail string
	Role       string
	Name       string
	ExpiresAt  time.Time
}

// Login memverifikasi kredensial lewat GoTrue, memeriksa profil admin,
// lalu membuat sesi. Mengembalikan token sesi (nilai cookie).
func (s *Service) Login(ctx context.Context, email, password, ip string) (*Session, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if !strings.Contains(email, "@") || email == "" || password == "" {
		s.recordFailure(ctx, ip)
		return nil, httpx.Unauthorized("invalid_credentials", "Email atau password salah.")
	}

	if s.cfg.SupabaseURL == "" || s.cfg.SupabaseAnonKey == "" {
		s.log.Error("SUPABASE_URL / anon key belum dikonfigurasi")
		return nil, httpx.Internal("auth_unconfigured", "Autentikasi belum dikonfigurasi.")
	}

	// Cek lockout dari tabel login_attempts (shared lintas instance).
	locked, wait, err := s.checkLockout(ctx, ip)
	if err != nil {
		return nil, httpx.Internal("db_error", "Gagal memeriksa status login.")
	}
	if locked {
		return nil, httpx.TooManyRequests("locked",
			fmt.Sprintf("Terlalu banyak percobaan. Coba lagi dalam %d menit.", int(wait.Minutes())+1))
	}
	if ok, _ := s.ipLimiter.Allow("login:" + ip); !ok {
		return nil, httpx.TooManyRequests("rate_limited", "Terlalu banyak percobaan login. Coba lagi nanti.")
	}

	// 1) Verifikasi kredensial via Supabase Auth (GoTrue).
	if !s.verifyGoTrue(ctx, email, password) {
		s.log.Warn("login: verifyGoTrue returned false", "email", email)
		s.recordFailure(ctx, ip)
		return nil, httpx.Unauthorized("invalid_credentials", "Email atau password salah.")
	}

	// 2) Otorisasi: akun harus profil admin aktif di schema pusdatin.
	profile, err := s.loadAdminProfile(ctx, email)
	if err != nil {
		s.log.Warn("login: loadAdminProfile failed", "email", email, "error", err)
		s.recordFailure(ctx, ip)
		if errors.Is(err, ErrNotAdmin) {
			s.log.Warn("login akun non-admin ditolak", "email", email, "ip", ip)
			return nil, httpx.Forbidden("not_admin", "Akun tidak memiliki akses panel pengaduan.")
		}
		return nil, httpx.Internal("db_error", "Gagal memuat data admin.")
	}

	s.resetAttempts(ctx, ip)

	// 3) Buat token sesi acak; simpan hash-nya saja.
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return nil, httpx.Internal("internal_error", "Gagal membuat sesi.")
	}
	token := hex.EncodeToString(raw)
	expires := time.Now().Add(time.Duration(s.cfg.SessionTTLHours) * time.Hour)

	_, err = s.pool.Exec(ctx, fmt.Sprintf(`
		INSERT INTO %s (token_hash, admin_email, role, expires_at)
		VALUES ($1, $2, $3, $4)`, s.sessions),
		hashToken(token), profile.Email, profile.Role, expires)
	if err != nil {
		s.log.Error("insert session gagal", "error", err)
		return nil, httpx.Internal("db_error", "Gagal membuat sesi.")
	}

	s.purgeExpiredSessions(ctx)

	return &Session{
		Token:      token,
		AdminEmail: profile.Email,
		Role:       profile.Role,
		Name:       profile.Name,
		ExpiresAt:  expires,
	}, nil
}

// verifyGoTrue memanggil endpoint token Supabase Auth.
func (s *Service) verifyGoTrue(ctx context.Context, email, password string) bool {
	body, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	url := strings.TrimRight(s.cfg.SupabaseURL, "/") + "/auth/v1/token?grant_type=password"

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		s.log.Error("verifyGoTrue NewRequest failed", "error", err)
		return false
	}
	req.Header.Set("apikey", s.cfg.SupabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+s.cfg.SupabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.http.Do(req)
	if err != nil {
		s.log.Error("goTrue gagal dihubungi", "error", err)
		return false
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		s.log.Warn("goTrue login ditolak", "status", resp.StatusCode, "body", string(respBody))
		return false
	}
	s.log.Info("goTrue login sukses", "status", resp.StatusCode)

	return true
}

// loadAdminProfile mengambil profil admin aktif dari schema pusdatin.
func (s *Service) loadAdminProfile(ctx context.Context, email string) (*Profile, error) {
	var p Profile
	err := s.pool.QueryRow(ctx, fmt.Sprintf(`
		SELECT email, name, role, status
		FROM %s
		WHERE LOWER(email) = $1`, s.profiles),
		email,
	).Scan(&p.Email, &p.Name, &p.Role, &p.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotAdmin
	}
	if err != nil {
		return nil, err
	}
	if p.Status != "active" || !isAdminRole(p.Role) {
		return nil, ErrNotAdmin
	}
	return &p, nil
}

// isAdminRole menentukan role yang berhak mengakses panel pengaduan.
func isAdminRole(role string) bool {
	switch role {
	case "super_admin", "admin", "sub_admin":
		return true
	}
	return false
}

// Profile adalah ringkasan profil pusdatin.
type Profile struct {
	Email  string
	Name   string
	Role   string
	Status string
}

// Lookup memvalidasi token sesi dan mengembalikan data admin.
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

// checkLockout membaca tabel login_attempts untuk IP.
func (s *Service) checkLockout(ctx context.Context, ip string) (bool, time.Duration, error) {
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
			VALUES ($1, $2, NOW(), $3)`, s.attempts),
			ip, newCount, newLock)
	} else {
		_, err = s.pool.Exec(ctx, fmt.Sprintf(`
			UPDATE %s SET attempt_count = $2, last_attempt = NOW(), lockout_until = $3
			WHERE ip_address = $1`, s.attempts),
			ip, newCount, newLock)
	}
	if err != nil {
		s.log.Error("catat percobaan login gagal", "ip", ip, "error", err)
	}
}

// resetAttempts menghapus catatan percobaan setelah login sukses.
func (s *Service) resetAttempts(ctx context.Context, ip string) {
	_, _ = s.pool.Exec(ctx,
		`DELETE FROM `+s.attempts+` WHERE ip_address = $1`, ip)
}

// purgeExpiredSessions membersihkan sesi kedaluwarsa.
func (s *Service) purgeExpiredSessions(ctx context.Context) {
	_, _ = s.pool.Exec(ctx, `DELETE FROM `+s.sessions+` WHERE expires_at < NOW()`)
}

// hashToken menghitung SHA-256 token sesi (hanya hash yang disimpan DB).
func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}