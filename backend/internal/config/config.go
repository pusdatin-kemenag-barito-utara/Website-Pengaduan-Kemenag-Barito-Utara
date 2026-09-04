package config

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Config memuat seluruh konfigurasi backend yang dibaca dari environment
// atau file .env.local / .env di direktori kerja.
type Config struct {
	Port      string
	Host      string
	AppSchema string

	DatabaseURL string

	AdminEmail    string
	AdminPassword string
	AdminName     string

	R2AccessKeyID     string
	R2SecretAccessKey string
	R2EndpointURL     string
	R2BucketPengaduan string
	R2PublicURL       string

	TurnstileSecretKey string

	SessionSecret   string
	SessionTTLHours int
	CookieSecure    bool
	CookieSameSite  string
	PublicSiteURL   string
	AllowDevOrigin  string
}

// Load membaca konfigurasi dari file .env.local / .env di direktori kerja
// (dan parent directory, hingga root monorepo) lalu environment.
func Load() (*Config, error) {
	loadDotEnv(".env.local")
	loadDotEnv(".env")
	// Fallback ke .env.local di root monorepo (CWD di dalam backend/).
	for i := 1; i <= 4; i++ {
		loadDotEnv(strings.Repeat("../", i) + ".env.local")
	}

	adminEmail := getEnv("SUPER_ADMIN_EMAIL", getEnv("ADMIN_EMAIL", os.Getenv("ADMIN_USERNAME")))
	adminPass := getEnv("SUPER_ADMIN_PASSWORD", os.Getenv("ADMIN_PASSWORD"))
	adminName := getEnv("SUPER_ADMIN_NAME", getEnv("ADMIN_NAME", "Super Admin"))

	cfg := &Config{
		Port:              getEnv("PORT", "8080"),
		Host:              getEnv("HOST", "0.0.0.0"),
		AppSchema:         getEnv("DB_SCHEMA", "kemenag-pengaduan"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		AdminEmail:        adminEmail,
		AdminPassword:     adminPass,
		AdminName:         adminName,
		R2AccessKeyID:     os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2EndpointURL:     os.Getenv("R2_ENDPOINT_URL"),
		R2BucketPengaduan: getEnv("R2_BUCKET_PENGADUAN", "data-pengaduan"),
		R2PublicURL:       getEnv("R2_PUBLIC_URL", "https://files.kemenag-baritoutara.com"),
		TurnstileSecretKey: os.Getenv("TURNSTILE_SECRET_KEY"),
		SessionSecret:     os.Getenv("SESSION_SECRET"),
		SessionTTLHours:   getInt("SESSION_TTL_HOURS", 24),
		CookieSecure:      getBool("COOKIE_SECURE", true),
		CookieSameSite:    getEnv("COOKIE_SAMESITE", "lax"),
		PublicSiteURL:     getEnv("PUBLIC_SITE_URL", "http://localhost:3000"),
		AllowDevOrigin:    os.Getenv("ALLOW_DEV_ORIGIN"),
	}

	if cfg.SessionSecret == "" {
		return nil, fmt.Errorf("SESSION_SECRET wajib diisi pada file konfigurasi environment (.env.local)")
	}
	if cfg.AdminPassword == "" {
		return nil, fmt.Errorf("ADMIN_PASSWORD atau SUPER_ADMIN_PASSWORD wajib diisi pada file konfigurasi environment (.env.local)")
	}
	if cfg.AdminEmail == "" {
		return nil, fmt.Errorf("ADMIN_EMAIL atau SUPER_ADMIN_EMAIL wajib diisi pada file konfigurasi environment (.env.local)")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func getBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return fallback
}

// loadDotEnv membaca file KEY=VALUE tanpa menimpa env yang sudah ada.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		val = strings.Trim(val, `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, val)
		}
	}
	if err := scanner.Err(); err != nil {
		// abaikan error bacaan akhir file env non-kritis
		_ = err
	}
}