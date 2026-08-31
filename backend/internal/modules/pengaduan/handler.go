package pengaduan

import (
	"errors"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/middleware"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// Handler menangani endpoint publik pengaduan.
type Handler struct {
	svc       *Service
	trackLmtr *ratelimit.Limiter
}

// NewHandler membuat Handler dengan limiter pelacakan 10/menit per IP.
func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc, trackLmtr: ratelimit.New(10, time.Minute)}
}

// Register memasang rute modul pengaduan ke router Fiber.
func (h *Handler) Register(r fiber.Router) {
	r.Post("/pengaduan", h.Submit)
	r.Get("/pengaduan/:ticket", h.Track)
}

// Submit menangani POST /api/v1/pengaduan (multipart/form-data).
func (h *Handler) Submit(c fiber.Ctx) error {
	in := &SubmitInput{
		Category:    c.FormValue("category"),
		ServiceUnit: c.FormValue("service_unit"),
		FullName:    c.FormValue("full_name"),
		PhoneNumber: strings.TrimPrefix(c.FormValue("phone_number"), "+"),
		Content:     c.FormValue("content"),
		IsAnonymous: c.FormValue("is_anonymous") == "true",
		Turnstile:   c.FormValue("cf-turnstile-response"),
		ClientIP:    middleware.ClientIP(c),
	}

	// Lampiran opsional (png/jpeg/pdf).
	fileHeader, err := c.FormFile("attachment")
	if err == nil && fileHeader != nil {
		file, ferr := fileHeader.Open()
		if ferr != nil {
			return httpx.WriteError(c, httpx.BadRequest("invalid_file", "Gagal membaca lampiran."))
		}
		defer file.Close()

		ct := fileHeader.Header.Get("Content-Type")
		if !allowedContentType(ct) {
			return httpx.WriteError(c, httpx.BadRequest("invalid_file_type", "Lampiran harus berupa PNG, JPG, atau PDF."))
		}
		data, rerr := io.ReadAll(io.LimitReader(file, maxAttachmentBytes+1))
		if rerr != nil {
			return httpx.WriteError(c, httpx.BadRequest("invalid_file", "Gagal membaca lampiran."))
		}
		if len(data) > maxAttachmentBytes {
			return httpx.WriteError(c, httpx.BadRequest("file_too_large", "Ukuran berkas lampiran maksimal 5 MB."))
		}

		// Validasi Magic Bytes biner asli (Anti MIME spoofing & anti executable cloaking)
		detectedCT := detectStrictContentType(data)
		if detectedCT == "" {
			return httpx.WriteError(c, httpx.BadRequest("invalid_file_type", "Format berkas tidak valid atau rusak. Hanya berkas PNG, JPG/JPEG, dan PDF asli yang diizinkan."))
		}

		in.Attachment = data
		in.ContentType = detectedCT
	} else if err != nil && !errors.Is(err, http.ErrMissingFile) && !errors.Is(err, multipart.ErrMessageTooLarge) {
		// Abaikan jika memang file tidak dikirim (opsional)
	}

	ticket, serr := h.svc.Submit(c.Context(), in)
	if serr != nil {
		return httpx.WriteError(c, serr)
	}

	return httpx.JSON(c, fiber.StatusCreated, fiber.Map{
		"success": true,
		"data": fiber.Map{
			"ticket_number": ticket,
			"message":       "Pengaduan berhasil dikirim. Simpan nomor tiket Anda untuk melacak status.",
		},
	})
}

// Track menangani GET /api/v1/pengaduan/:ticket.
func (h *Handler) Track(c fiber.Ctx) error {
	ticket := strings.ToUpper(strings.TrimSpace(c.Params("ticket")))
	if !validate.TicketFormat(ticket) {
		return httpx.WriteError(c, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
	}

	if ok, _ := h.trackLmtr.Allow("track:" + middleware.ClientIP(c)); !ok {
		return httpx.WriteError(c, httpx.TooManyRequests("rate_limited",
			"Terlalu banyak permintaan. Coba lagi nanti."))
	}

	res, err := h.svc.Track(c.Context(), ticket)
	if err != nil {
		return httpx.WriteError(c, err)
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": res})
}

// detectStrictContentType memeriksa magic bytes header biner berkas secara ketat.
func detectStrictContentType(data []byte) string {
	if len(data) < 4 {
		return ""
	}

	// 1. PNG: \x89PNG\r\n\x1a\n
	if len(data) >= 8 &&
		data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
		data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A {
		return "image/png"
	}

	// 2. JPEG / JPG: \xFF\xD8\xFF
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}

	// 3. PDF: %PDF-
	if len(data) >= 5 && data[0] == '%' && data[1] == 'P' && data[2] == 'D' && data[3] == 'F' && data[4] == '-' {
		return "application/pdf"
	}

	// Fallback http.DetectContentType dengan whitelist ketat
	detected := http.DetectContentType(data)
	switch detected {
	case "image/png":
		return "image/png"
	case "image/jpeg":
		return "image/jpeg"
	case "application/pdf":
		return "application/pdf"
	}

	return ""
}

func allowedContentType(ct string) bool {
	switch strings.ToLower(ct) {
	case "image/png", "image/jpeg", "image/jpg", "application/pdf":
		return true
	}
	return false
}