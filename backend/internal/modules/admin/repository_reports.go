package admin

import (
	"context"
	"fmt"
	"time"
)

// GetReportSummary mengumpulkan ringkasan dan daftar pengaduan berdasarkan rentang tanggal.
func (r *Repository) GetReportSummary(ctx context.Context, startDate, endDate string) (*ReportSummary, error) {
	where := " WHERE 1=1"
	args := []any{}

	if startDate != "" {
		args = append(args, startDate)
		where += fmt.Sprintf(" AND created_at >= $%d::timestamptz", len(args))
	}
	if endDate != "" {
		args = append(args, endDate+" 23:59:59")
		where += fmt.Sprintf(" AND created_at <= $%d::timestamptz", len(args))
	}

	rows, err := r.pool.Query(ctx, `
		SELECT id::text, ticket_number, category, service_unit, full_name,
			phone_number, content, is_anonymous, status, admin_response,
			file_url, rating, user_feedback, created_at, updated_at
		FROM `+r.table+where+`
		ORDER BY created_at DESC`,
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Item, 0)
	byStatus := make(map[string]int)
	byCategory := make(map[string]int)
	byUnit := make(map[string]int)
	var ratingSum float64
	var ratingCount int

	for rows.Next() {
		var it Item
		if err := rows.Scan(
			&it.ID, &it.TicketNumber, &it.Category, &it.ServiceUnit, &it.FullName,
			&it.PhoneNumber, &it.Content, &it.IsAnonymous, &it.Status, &it.AdminResponse,
			&it.FileKey, &it.Rating, &it.UserFeedback, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, it)

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
	}, rows.Err()
}
