package admin

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// GetReportSummary mengumpulkan ringkasan dan daftar pengaduan berdasarkan rentang tanggal.
func (r *Repository) GetReportSummary(ctx context.Context, startDate, endDate string) (*ReportSummary, error) {
	filters := []string{}
	if startDate != "" {
		filters = append(filters, fmt.Sprintf("created_at >= '%s 00:00:00.000Z'", startDate))
	}
	if endDate != "" {
		filters = append(filters, fmt.Sprintf("created_at <= '%s 23:59:59.999Z'", endDate))
	}

	filterStr := strings.Join(filters, " && ")
	res, err := database.ListRecords[Item](ctx, r.db, "pengaduan", 1, 5000, filterStr, "-created_at")
	if err != nil {
		return nil, err
	}

	items := res.Items
	byStatus := make(map[string]int)
	byCategory := make(map[string]int)
	byUnit := make(map[string]int)
	var ratingSum float64
	var ratingCount int

	for _, it := range items {
		byStatus[it.Status]++
		byCategory[it.Category]++
		byUnit[it.ServiceUnit]++
		if it.Rating != nil && *it.Rating > 0 {
			ratingSum += float64(*it.Rating)
			ratingCount++
		}
	}

	var avgRating *float64
	if ratingCount > 0 {
		avg := float64(int((ratingSum/float64(ratingCount))*100+0.5)) / 100
		avgRating = &avg
	}

	return &ReportSummary{
		StartDate:     startDate,
		EndDate:       endDate,
		Total:         len(items),
		ByStatus:      byStatus,
		ByCategory:    byCategory,
		ByServiceUnit: byUnit,
		AvgRating:     avgRating,
		Items:         items,
		GeneratedAt:   time.Now(),
	}, nil
}
