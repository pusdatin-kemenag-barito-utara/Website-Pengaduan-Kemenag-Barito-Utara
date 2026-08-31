package logger

import (
	"bytes"
	"log/slog"
	"strings"
	"testing"
)

func TestPrettyHandlerGeneralLog(t *testing.T) {
	var buf bytes.Buffer
	h := NewPrettyHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})
	log := slog.New(h)

	log.Info("server berjalan", "addr", "0.0.0.0:8080")

	output := buf.String()
	if !strings.Contains(output, "[BE:INFO]") {
		t.Errorf("expected [BE:INFO] badge, got: %s", output)
	}
	if !strings.Contains(output, "server berjalan") {
		t.Errorf("expected 'server berjalan', got: %s", output)
	}
	if !strings.Contains(output, "addr=") || !strings.Contains(output, "0.0.0.0:8080") {
		t.Errorf("expected attr 'addr' and value '0.0.0.0:8080', got: %s", output)
	}
}

func TestPrettyHandlerHTTPLog(t *testing.T) {
	var buf bytes.Buffer
	h := NewPrettyHandler(&buf, &slog.HandlerOptions{Level: slog.LevelInfo})
	log := slog.New(h)

	log.Info("http request",
		"method", "GET",
		"path", "/api/v1/layanan",
		"status", 200,
		"duration", "45.0ms",
		"ip", "127.0.0.1",
		"request_id", "test-req-123",
	)

	output := buf.String()
	if !strings.Contains(output, "[BE:API]") {
		t.Errorf("expected [BE:API] badge, got: %s", output)
	}
	if !strings.Contains(output, "GET") {
		t.Errorf("expected GET, got: %s", output)
	}
	if !strings.Contains(output, "/api/v1/layanan") {
		t.Errorf("expected /api/v1/layanan, got: %s", output)
	}
	if !strings.Contains(output, "200 OK") {
		t.Errorf("expected 200 OK, got: %s", output)
	}
	if !strings.Contains(output, "45.0ms") {
		t.Errorf("expected 45.0ms, got: %s", output)
	}
}
