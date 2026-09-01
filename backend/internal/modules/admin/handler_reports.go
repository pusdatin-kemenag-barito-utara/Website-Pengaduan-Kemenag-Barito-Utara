package admin

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

// GetReportSummary menangani GET /api/v1/admin/reports/summary.
func (h *Handler) GetReportSummary(c fiber.Ctx) error {
	startDate := strings.TrimSpace(c.Query("start_date"))
	endDate := strings.TrimSpace(c.Query("end_date"))

	summary, err := h.repo.GetReportSummary(c.Context(), startDate, endDate)
	if err != nil {
		h.log.Error("gagal membuat rekap laporan", "error", err)
		return httpx.WriteError(c, httpx.Internal("db_error", "Gagal membuat rekap laporan."))
	}

	return httpx.JSON(c, fiber.StatusOK, fiber.Map{"success": true, "data": summary})
}
