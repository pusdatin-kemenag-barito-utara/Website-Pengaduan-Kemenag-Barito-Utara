package rating

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/middleware"
)

// Handler menangani endpoint rating.
type Handler struct {
	svc *Service
}

// NewHandler membuat Handler rating.
func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// Register memasang rute modul rating.
func (h *Handler) Register(r chi.Router) {
	r.Post("/pengaduan/{ticket}/rating", h.Rate)
}

// Rate menangani POST /api/v1/pengaduan/{ticket}/rating.
func (h *Handler) Rate(w http.ResponseWriter, r *http.Request) {
	ticket := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "ticket")))

	var body struct {
		Rating   int    `json:"rating"`
		Feedback string `json:"feedback,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.WriteError(w, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
		return
	}

	err := h.svc.Rate(r.Context(), &RateInput{
		Ticket:   ticket,
		Rating:   body.Rating,
		Feedback: body.Feedback,
		ClientIP: middleware.ClientIP(r),
	})
	if err != nil {
		httpx.WriteError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"success": true,
		"message": "Terima kasih atas penilaian Anda.",
	})
}