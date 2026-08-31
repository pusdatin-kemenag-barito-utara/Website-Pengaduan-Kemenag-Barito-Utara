// Package middleware berisi middleware HTTP untuk Fiber v3 dengan integrasi Cloudflare Security & CDN.
package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

const requestIDKey = "request_id"

// RequestID menambahkan header X-Request-ID (atau menggunakan CF-Ray) pada tiap respons dan menyimpan ke context.
func RequestID() fiber.Handler {
	return func(c fiber.Ctx) error {
		id := c.Get("X-Request-ID")
		if id == "" {
			// Prioritaskan Cloudflare Ray ID jika tersedia
			if cfRay := c.Get("CF-Ray"); cfRay != "" {
				id = cfRay
			} else {
				id = randomHex(8)
			}
		}
		c.Locals(requestIDKey, id)
		c.Set("X-Request-ID", id)
		return c.Next()
	}
}

// RequestIDFromContext mengambil request id dari fiber.Ctx locals.
func RequestIDFromContext(c fiber.Ctx) string {
	if id, ok := c.Locals(requestIDKey).(string); ok {
		return id
	}
	return ""
}

// Recoverer menangkap panic dan mengembalikan 500 JSON.
func Recoverer(log *slog.Logger) fiber.Handler {
	return func(c fiber.Ctx) (err error) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Error("panic recovered",
					"panic", rec,
					"stack", string(debug.Stack()),
					"request_id", RequestIDFromContext(c),
				)
				err = httpx.JSON(c, fiber.StatusInternalServerError, fiber.Map{
					"success": false,
					"error":   "internal_error",
					"message": "Terjadi kesalahan pada server.",
				})
			}
		}()
		return c.Next()
	}
}

// AccessLog mencatat tiap request dengan detail kecepatan, status, method, path, IP, Cloudflare Ray, dan Request ID.
func AccessLog(log *slog.Logger) fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		duration := time.Since(start)
		durationFormatted := formatDuration(duration)

		status := c.Response().StatusCode()
		if err != nil {
			var fiberErr *fiber.Error
			if errorsAs(err, &fiberErr) {
				status = fiberErr.Code
			}
		}

		// Kumpulkan atribut tambahan
		cfRay := c.Get("CF-Ray")
		cfCountry := c.Get("CF-IPCountry")

		var logAttrs = []any{
			"method", c.Method(),
			"path", c.Path(),
			"status", status,
			"duration", durationFormatted,
			"duration_ms", duration.Milliseconds(),
			"ip", ClientIP(c),
			"request_id", RequestIDFromContext(c),
		}

		if cfRay != "" {
			logAttrs = append(logAttrs, "cf_ray", cfRay)
		}
		if cfCountry != "" {
			logAttrs = append(logAttrs, "country", cfCountry)
		}

		log.Info("http request", logAttrs...)

		return err
	}
}

// SecurityHeaders menetapkan header keamanan enterprise (WAF, HSTS, CSP, COOP, CORP).
func SecurityHeaders() fiber.Handler {
	return func(c fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), browsing-topics=()")
		c.Set("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
		c.Set("Cross-Origin-Resource-Policy", "same-origin")
		c.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		c.Set("Alt-Svc", `h3=":443"; ma=86400, h3-29=":443"; ma=86400`)

		// Content Security Policy untuk API & Static responses
		c.Set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'self'")

		return c.Next()
	}
}

// ClientIP mengambil IP klien asli, memprioritaskan Cloudflare CF-Connecting-IP dan True-Client-IP.
func ClientIP(c fiber.Ctx) string {
	// 1. Cloudflare Connecting IP (paling presisi di balik Cloudflare Proxy)
	if cfIP := strings.TrimSpace(c.Get("CF-Connecting-IP")); cfIP != "" {
		if ip := net.ParseIP(cfIP); ip != nil {
			return ip.String()
		}
	}

	// 2. Cloudflare True-Client-IP (Enterprise Cloudflare)
	if trueIP := strings.TrimSpace(c.Get("True-Client-IP")); trueIP != "" {
		if ip := net.ParseIP(trueIP); ip != nil {
			return ip.String()
		}
	}

	// 3. Standar X-Forwarded-For (Reverse Proxy / Load Balancer)
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		first, _, _ := strings.Cut(xff, ",")
		if ip := net.ParseIP(strings.TrimSpace(first)); ip != nil {
			return ip.String()
		}
	}

	// 4. Remote Socket IP
	return c.IP()
}

func randomHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func formatDuration(d time.Duration) string {
	if d < time.Millisecond {
		return fmt.Sprintf("%dµs", d.Microseconds())
	}
	if d < time.Second {
		return fmt.Sprintf("%.1fms", float64(d.Microseconds())/1000.0)
	}
	return fmt.Sprintf("%.2fs", d.Seconds())
}

func errorsAs(err error, target **fiber.Error) bool {
	if fiberErr, ok := err.(*fiber.Error); ok {
		*target = fiberErr
		return true
	}
	return false
}