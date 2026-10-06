package admin

import (
	"context"
	"fmt"
	"strings"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// ListRatings mengambil daftar ulasan serta ringkasan metrik IKM via PocketBase.
func (r *Repository) ListRatings(ctx context.Context, page, perPage int, minStar int, search string) (*RatingResult, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	filters := []string{"rating != null && rating > 0"}
	if minStar > 0 {
		filters = append(filters, fmt.Sprintf("rating >= %d", minStar))
	}
	if search != "" {
		filters = append(filters, fmt.Sprintf("(user_feedback ~ '%s' || service_unit ~ '%s' || ticket_number ~ '%s')", search, search, search))
	}

	filterStr := strings.Join(filters, " && ")
	res, err := database.ListRecords[Item](ctx, r.db, "pengaduan", page, perPage, filterStr, "-created_at")
	if err != nil {
		return nil, err
	}

	items := make([]RatingItem, 0, len(res.Items))
	for _, it := range res.Items {
		normalizeItemDates(&it)
		rating := 0
		if it.Rating != nil {
			rating = int(*it.Rating)
		}
		items = append(items, RatingItem{
			ID:           it.ID,
			TicketNumber: it.TicketNumber,
			Category:     it.Category,
			ServiceUnit:  it.ServiceUnit,
			FullName:     it.FullName,
			Rating:       rating,
			UserFeedback: it.UserFeedback,
			CreatedAt:    it.CreatedAt,
		})
	}

	// Hitung metrik IKM dari seluruh pengaduan yang telah dinilai
	allRated, err := database.ListRecords[Item](ctx, r.db, "pengaduan", 1, 5000, "rating != null && rating > 0", "")
	stats := RatingStats{
		Distribution:   map[string]int{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
		PerServiceUnit: make(map[string]any),
	}

	if err == nil && allRated != nil {
		stats.TotalRated = len(allRated.Items)
		var ratingSum float64
		for _, it := range allRated.Items {
			if it.Rating != nil && *it.Rating > 0 {
				star := int(*it.Rating)
				stats.Distribution[fmt.Sprint(star)]++
				ratingSum += float64(star)
			}
		}

		if stats.TotalRated > 0 {
			avg := float64(int((ratingSum/float64(stats.TotalRated))*100+0.5)) / 100
			stats.AvgRating = avg
			stats.IKMScore = float64(int((avg/5.0*100)*100+0.5)) / 100
			switch {
			case stats.IKMScore >= 88.31:
				stats.IKMGrade = "A (Sangat Baik)"
			case stats.IKMScore >= 76.61:
				stats.IKMGrade = "B (Baik)"
			case stats.IKMScore >= 65.00:
				stats.IKMGrade = "C (Kurang Baik)"
			default:
				stats.IKMGrade = "D (Tidak Baik)"
			}
		} else {
			stats.IKMGrade = "Belum Ada Data"
		}
	}

	return &RatingResult{
		Items: items,
		Total: res.TotalItems,
		Page:  res.Page,
		Pages: res.TotalPages,
		Stats: stats,
	}, nil
}
