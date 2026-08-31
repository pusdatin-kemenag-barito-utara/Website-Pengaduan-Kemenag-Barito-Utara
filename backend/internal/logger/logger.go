package logger

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"sync"
)

// ANSI color codes
const (
	ansiReset  = "\033[0m"
	ansiBold   = "\033[1m"
	ansiRed    = "\033[31m"
	ansiGreen  = "\033[32m"
	ansiYellow = "\033[33m"
	ansiCyan   = "\033[36m"
	ansiWhite  = "\033[37m"
	ansiGray   = "\033[90m"
)

// PrettyHandler memformat log secara rapi dan berwarna untuk terminal development.
type PrettyHandler struct {
	opts   *slog.HandlerOptions
	writer io.Writer
	mu     *sync.Mutex
	attrs  []slog.Attr
	groups []string
}

// NewPrettyHandler membuat handler pretty-print baru.
func NewPrettyHandler(out io.Writer, opts *slog.HandlerOptions) *PrettyHandler {
	if opts == nil {
		opts = &slog.HandlerOptions{Level: slog.LevelInfo}
	}
	return &PrettyHandler{
		opts:   opts,
		writer: out,
		mu:     &sync.Mutex{},
	}
}

func (h *PrettyHandler) Enabled(_ context.Context, level slog.Level) bool {
	minLevel := slog.LevelInfo
	if h.opts.Level != nil {
		minLevel = h.opts.Level.Level()
	}
	return level >= minLevel
}

func (h *PrettyHandler) Handle(_ context.Context, r slog.Record) error {
	var sb strings.Builder

	// Timestamp (HH:MM:SS)
	timeStr := r.Time.Format("15:04:05")
	sb.WriteString(fmt.Sprintf("%s%s%s ", ansiGray, timeStr, ansiReset))

	// Kumpulkan seluruh atribut (dari handler & record)
	attrMap := make(map[string]any)
	for _, a := range h.attrs {
		attrMap[a.Key] = a.Value.Any()
	}
	r.Attrs(func(a slog.Attr) bool {
		attrMap[a.Key] = a.Value.Any()
		return true
	})

	// Format khusus untuk request HTTP
	if r.Message == "http request" {
		method, _ := attrMap["method"].(string)
		path, _ := attrMap["path"].(string)

		var status int
		switch v := attrMap["status"].(type) {
		case int:
			status = v
		case int64:
			status = int(v)
		case float64:
			status = int(v)
		}

		var durationStr string
		switch v := attrMap["duration"].(type) {
		case string:
			durationStr = v
		default:
			switch d := attrMap["duration_ms"].(type) {
			case int64:
				durationStr = fmt.Sprintf("%dms", d)
			case int:
				durationStr = fmt.Sprintf("%dms", d)
			case float64:
				durationStr = fmt.Sprintf("%.1fms", d)
			default:
				durationStr = "0ms"
			}
		}

		reqID, _ := attrMap["request_id"].(string)
		ip, _ := attrMap["ip"].(string)

		// Badge [BE:API]
		sb.WriteString(fmt.Sprintf("%s%s[BE:API]%s ", ansiBold, ansiYellow, ansiReset))

		// Method HTTP berwarna
		sb.WriteString(colorizeMethod(method))
		sb.WriteString(" ")

		// URL Path
		sb.WriteString(fmt.Sprintf("%s%-24s%s ", ansiBold, path, ansiReset))

		// Status Code & Text
		sb.WriteString(colorizeStatus(status))
		sb.WriteString(" ")

		// Durasi eksekusi (kecepatan)
		sb.WriteString(colorizeDuration(durationStr))

		// Info tambahan (IP & Request ID)
		var extras []string
		if ip != "" && ip != "::1" && ip != "127.0.0.1" {
			extras = append(extras, fmt.Sprintf("ip=%s", ip))
		}
		if reqID != "" {
			extras = append(extras, fmt.Sprintf("req=%s", reqID))
		}
		if len(extras) > 0 {
			sb.WriteString(fmt.Sprintf(" %s[%s]%s", ansiGray, strings.Join(extras, " "), ansiReset))
		}
	} else {
		// Format log umum
		sb.WriteString(formatLevel(r.Level))
		sb.WriteString(" ")
		sb.WriteString(r.Message)

		// Tampilkan atribut yang ada
		if len(attrMap) > 0 {
			for k, v := range attrMap {
				sb.WriteString(fmt.Sprintf(" %s%s=%s%v", ansiGray, k, ansiReset, v))
			}
		}
	}

	sb.WriteString("\n")

	h.mu.Lock()
	defer h.mu.Unlock()
	_, err := h.writer.Write([]byte(sb.String()))
	return err
}

func (h *PrettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]slog.Attr, len(h.attrs)+len(attrs))
	copy(newAttrs, h.attrs)
	copy(newAttrs[len(h.attrs):], attrs)
	return &PrettyHandler{
		opts:   h.opts,
		writer: h.writer,
		mu:     h.mu,
		attrs:  newAttrs,
		groups: h.groups,
	}
}

func (h *PrettyHandler) WithGroup(name string) slog.Handler {
	newGroups := append(h.groups, name)
	return &PrettyHandler{
		opts:   h.opts,
		writer: h.writer,
		mu:     h.mu,
		attrs:  h.attrs,
		groups: newGroups,
	}
}

func formatLevel(level slog.Level) string {
	switch {
	case level >= slog.LevelError:
		return fmt.Sprintf("%s%s[BE:ERROR]%s", ansiBold, ansiRed, ansiReset)
	case level >= slog.LevelWarn:
		return fmt.Sprintf("%s%s[BE:WARN]%s ", ansiBold, ansiYellow, ansiReset)
	case level >= slog.LevelInfo:
		return fmt.Sprintf("%s%s[BE:INFO]%s ", ansiBold, ansiGreen, ansiReset)
	default:
		return fmt.Sprintf("%s%s[BE:DEBUG]%s", ansiBold, ansiGray, ansiReset)
	}
}

func colorizeMethod(method string) string {
	var color string
	switch method {
	case "GET":
		color = ansiCyan
	case "POST":
		color = ansiGreen
	case "PUT", "PATCH":
		color = ansiYellow
	case "DELETE":
		color = ansiRed
	default:
		color = ansiWhite
	}
	return fmt.Sprintf("%s%s%-6s%s", ansiBold, color, method, ansiReset)
}

func colorizeStatus(status int) string {
	statusText := http.StatusText(status)
	if statusText == "" {
		statusText = fmt.Sprintf("%d", status)
	} else {
		statusText = fmt.Sprintf("%d %s", status, statusText)
	}

	var color string
	switch {
	case status >= 200 && status < 300:
		color = ansiGreen
	case status >= 300 && status < 400:
		color = ansiCyan
	case status >= 400 && status < 500:
		color = ansiYellow
	case status >= 500:
		color = ansiRed
	default:
		color = ansiWhite
	}
	return fmt.Sprintf("%s%s%-15s%s", ansiBold, color, statusText, ansiReset)
}

func colorizeDuration(d string) string {
	var color = ansiGreen
	if strings.Contains(d, "s") && !strings.Contains(d, "ms") && !strings.Contains(d, "µs") && !strings.Contains(d, "ns") {
		var sec float64
		_, _ = fmt.Sscanf(d, "%fs", &sec)
		if sec >= 3.0 {
			color = ansiRed
		} else if sec >= 1.0 {
			color = ansiYellow
		} else {
			color = ansiGreen
		}
	} else if strings.Contains(d, "ms") {
		var ms float64
		_, _ = fmt.Sscanf(d, "%fms", &ms)
		if ms >= 2000 {
			color = ansiRed
		} else if ms >= 800 {
			color = ansiYellow
		} else {
			color = ansiGreen
		}
	}
	return fmt.Sprintf("%s(%s)%s", color, d, ansiReset)
}

// New membuat logger sesuai format (pretty untuk dev, JSON untuk prod).
func New() *slog.Logger {
	format := os.Getenv("LOG_FORMAT")
	env := os.Getenv("APP_ENV")

	if format == "json" || (format == "" && env == "production") {
		handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})
		return slog.New(handler)
	}

	handler := NewPrettyHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	return slog.New(handler)
}