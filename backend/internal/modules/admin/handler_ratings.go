package admin

import (
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

// ListRatings menangani GET /api/v1/admin/ratings.
func (h *Handler) ListRatings(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page"))
	perPage, _ := strconv.Atoi(c.Query("per_page"))
	minStar, _ := strconv.Atoi(c.Query("star"))
	search := strings.TrimSpace(c.Query("search"))

	res, err := h.repo.ListRatings(c.Context(), page, perPage, minStar, search)
	if err != nil {
		h.log.Error("gagal memuat rating", "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal memuat ulasan kepuasan."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": res})
}
