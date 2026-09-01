package admin

import (
	"context"
	"fmt"
)

// ListRatings mengambil daftar ulasan serta ringkasan metrik IKM.
func (r *Repository) ListRatings(ctx context.Context, page, perPage int, minStar int, search string) (*RatingResult, error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}

	where := " WHERE rating IS NOT NULL"
	args := []any{}

	if minStar > 0 {
		args = append(args, minStar)
		where += fmt.Sprintf(" AND rating = $%d", len(args))
	}
	if search != "" {
		args = append(args, "%"+search+"%")
		where += fmt.Sprintf(" AND (user_feedback ILIKE $%d OR service_unit ILIKE $%d OR ticket_number ILIKE $%d)", len(args), len(args), len(args))
	}

	offset := (page - 1) * perPage
	args = append(args, perPage, offset)

	rows, err := r.pool.Query(ctx, `
		SELECT id::text, ticket_number, category, service_unit, full_name, rating, user_feedback, created_at
		FROM `+r.table+where+`
		ORDER BY created_at DESC
		LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)),
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]RatingItem, 0)
	for rows.Next() {
		var it RatingItem
		if err := rows.Scan(&it.ID, &it.TicketNumber, &it.Category, &it.ServiceUnit, &it.FullName, &it.Rating, &it.UserFeedback, &it.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var total int
	countArgs := args[:len(args)-2]
	_ = r.pool.QueryRow(ctx, `SELECT count(*) FROM `+r.table+where, countArgs...).Scan(&total)

	// Hitung statistik keseluruhan rating & IKM
	var stats RatingStats
	stats.Distribution = map[string]int{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
	stats.PerServiceUnit = make(map[string]any)

	var avgRating *float64
	var totalRated int
	_ = r.pool.QueryRow(ctx, `SELECT count(*), AVG(rating) FROM `+r.table+` WHERE rating IS NOT NULL`).Scan(&totalRated, &avgRating)
	stats.TotalRated = totalRated
	if avgRating != nil {
		stats.AvgRating = float64(int(*avgRating*100+0.5)) / 100
		// Skala IKM Kemenpan-RB: (Nilai Rata-rata / 5) * 100
		stats.IKMScore = float64(int((*avgRating/5.0*100)*100+0.5)) / 100
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

	// Distribusi 1..5
	distRows, err := r.pool.Query(ctx, `SELECT rating, count(*) FROM `+r.table+` WHERE rating IS NOT NULL GROUP BY rating`)
	if err == nil {
		defer distRows.Close()
		for distRows.Next() {
			var star, cnt int
			if err := distRows.Scan(&star, &cnt); err == nil {
				stats.Distribution[fmt.Sprint(star)] = cnt
			}
		}
	}

	pages := (total + perPage - 1) / perPage
	return &RatingResult{
		Items: items,
		Total: total,
		Page:  page,
		Pages: pages,
		Stats: stats,
	}, nil
}
