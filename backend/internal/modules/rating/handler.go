package rating

import (
	"strings"

	"github.com/gofiber/fiber/v3"
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
func (h *Handler) Register(r fiber.Router) {
	r.Post("/pengaduan/:ticket/rating", h.Rate)
}

// Rate menangani POST /api/v1/pengaduan/:ticket/rating.
func (h *Handler) Rate(c fiber.Ctx) error {
	ticket := strings.ToUpper(strings.TrimSpace(c.Params("ticket")))

	var body struct {
		Rating   int    `json:"rating"`
		Feedback string `json:"feedback,omitempty"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid_json", "Body JSON tidak valid."))
	}

	err := h.svc.Rate(c.Context(), &RateInput{
		Ticket:   ticket,
		Rating:   body.Rating,
		Feedback: body.Feedback,
		ClientIP: middleware.ClientIP(c),
	})
	if err != nil {
		return httpx.WriteError(c, err)
	}
	return httpx.JSON(c, fiber.StatusOK, fiber.Map{
		"success": true,
		"message": "Terima kasih atas penilaian Anda.",
	})
}