package pengaduan

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/middleware"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
	"time"
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

// Register memasang rute modul pengaduan.
func (h *Handler) Register(r chi.Router) {
	r.Post("/pengaduan", h.Submit)
	r.Get("/pengaduan/{ticket}", h.Track)
}

// Submit menangani POST /api/v1/pengaduan (multipart/form-data).
func (h *Handler) Submit(w http.ResponseWriter, r *http.Request) {
	// 6 MB: 5 MB file + ruang untuk field.
	if err := r.ParseMultipartForm(6 << 20); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_form", "Form tidak valid atau terlalu besar (maks. 5 MB)."))
		return
	}
	defer r.MultipartForm.RemoveAll()

	in := &SubmitInput{
		Category:    r.FormValue("category"),
		ServiceUnit: r.FormValue("service_unit"),
		FullName:    r.FormValue("full_name"),
		PhoneNumber: strings.TrimPrefix(r.FormValue("phone_number"), "+"),
		Content:     r.FormValue("content"),
		IsAnonymous: r.FormValue("is_anonymous") == "true",
		Turnstile:   r.FormValue("cf-turnstile-response"),
		ClientIP:    middleware.ClientIP(r),
	}

	// Lampiran opsional (png/jpeg/pdf).
	file, header, err := r.FormFile("attachment")
	if err == nil {
		defer file.Close()
		ct := header.Header.Get("Content-Type")
		if !allowedContentType(ct) {
			httpx.WriteError(w, httpx.BadRequest("invalid_file_type", "Lampiran harus berupa PNG, JPG, atau PDF."))
			return
		}
		data, rerr := io.ReadAll(io.LimitReader(file, maxAttachmentBytes+1))
		if rerr != nil {
			httpx.WriteError(w, httpx.BadRequest("invalid_file", "Gagal membaca lampiran."))
			return
		}
		in.Attachment = data
		in.ContentType = ct
	} else if !errors.Is(err, http.ErrMissingFile) {
		httpx.WriteError(w, httpx.BadRequest("invalid_file", "Gagal membaca lampiran."))
		return
	}

	ticket, serr := h.svc.Submit(r.Context(), in)
	if serr != nil {
		httpx.WriteError(w, serr)
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{
		"success": true,
		"data": map[string]string{
			"ticket_number": ticket,
			"message":       "Pengaduan berhasil dikirim. Simpan nomor tiket Anda untuk melacak status.",
		},
	})
}

// Track menangani GET /api/v1/pengaduan/{ticket}.
func (h *Handler) Track(w http.ResponseWriter, r *http.Request) {
	ticket := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "ticket")))
	if !validate.TicketFormat(ticket) {
		httpx.WriteError(w, httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid."))
		return
	}

	if ok, wait := h.trackLmtr.Allow("track:" + middleware.ClientIP(r)); !ok {
		httpx.WriteError(w, httpx.TooManyRequests("rate_limited",
			"Terlalu banyak permintaan. Coba lagi dalam %d detik."))
		_ = wait
		return
	}

	res, err := h.svc.Track(r.Context(), ticket)
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"success": true, "data": res})
}

func allowedContentType(ct string) bool {
	switch strings.ToLower(ct) {
	case "image/png", "image/jpeg", "application/pdf":
		return true
	}
	return false
}