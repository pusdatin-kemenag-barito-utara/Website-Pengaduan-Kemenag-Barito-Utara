package admin

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository mengakses database modul admin.
type Repository struct {
	pool           *pgxpool.Pool
	table          string
	templatesTable string
	settingsTable  string
	log            *slog.Logger
}

// NewRepository membuat Repository admin.
func NewRepository(pool *pgxpool.Pool, schema string, log *slog.Logger) *Repository {
	return &Repository{
		pool:           pool,
		table:          fmt.Sprintf("%q.%q", schema, "pengaduan"),
		templatesTable: fmt.Sprintf("%q.%q", schema, "templates"),
		settingsTable:  fmt.Sprintf("%q.%q", schema, "settings"),
		log:            log,
	}
}

// List mengambil halaman pengaduan dengan filter.
func (r *Repository) List(ctx context.Context, f ListFilter) (*ListResult, error) {
	where := ""
	args := []any{}
	if f.Status != "" {
		args = append(args, f.Status)
		where += fmt.Sprintf(" WHERE status = $%d", len(args))
	}
	if f.Category != "" {
		args = append(args, f.Category)
		if where == "" {
			where += fmt.Sprintf(" WHERE category = $%d", len(args))
		} else {
			where += fmt.Sprintf(" AND category = $%d", len(args))
		}
	}
	if f.Search != "" {
		args = append(args, "%"+f.Search+"%")
		if where == "" {
			where += fmt.Sprintf(" WHERE (ticket_number ILIKE $%d OR full_name ILIKE $%d OR phone_number ILIKE $%d)", len(args), len(args), len(args))
		} else {
			where += fmt.Sprintf(" AND (ticket_number ILIKE $%d OR full_name ILIKE $%d OR phone_number ILIKE $%d)", len(args), len(args), len(args))
		}
	}

	offset := (f.Page - 1) * f.PerPage
	args = append(args, f.PerPage, offset)

	rows, err := r.pool.Query(ctx, `
		SELECT id::text, ticket_number, category, service_unit, full_name,
			phone_number, content, is_anonymous, status, admin_response,
			file_url, rating, user_feedback, created_at, updated_at
		FROM `+r.table+where+`
		ORDER BY created_at DESC
		LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)),
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Item, 0)
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
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	var total int
	countArgs := args[:len(args)-2]
	countQuery := `SELECT count(*) FROM ` + r.table + where
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	pages := (total + f.PerPage - 1) / f.PerPage
	return &ListResult{Items: items, Total: total, Page: f.Page, Pages: pages}, nil
}

// FindByTicket mengambil satu pengaduan berdasarkan nomor tiket.
func (r *Repository) FindByTicket(ctx context.Context, ticket string) (*Item, error) {
	var it Item
	err := r.pool.QueryRow(ctx, `
		SELECT id::text, ticket_number, category, service_unit, full_name,
			phone_number, content, is_anonymous, status, admin_response,
			file_url, rating, user_feedback, created_at, updated_at
		FROM `+r.table+`
		WHERE ticket_number = $1`,
		ticket,
	).Scan(
		&it.ID, &it.TicketNumber, &it.Category, &it.ServiceUnit, &it.FullName,
		&it.PhoneNumber, &it.Content, &it.IsAnonymous, &it.Status, &it.AdminResponse,
		&it.FileKey, &it.Rating, &it.UserFeedback, &it.CreatedAt, &it.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &it, nil
}

// GetAllFileKeys mengambil semua file_url aktif dari tabel pengaduan.
func (r *Repository) GetAllFileKeys(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT file_url
		FROM `+r.table+`
		WHERE file_url IS NOT NULL AND file_url != ''`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	keys := make([]string, 0)
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err == nil && k != "" {
			keys = append(keys, k)
		}
	}
	return keys, rows.Err()
}

// UpdateStatusAndResponse memperbarui status dan tanggapan admin.
func (r *Repository) UpdateStatusAndResponse(ctx context.Context, ticket, status string, response *string) error {
	ct, err := r.pool.Exec(ctx, `
		UPDATE `+r.table+`
		SET status = CASE WHEN $1 != '' THEN $1 ELSE status END,
			admin_response = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE admin_response END
		WHERE ticket_number = $3`,
		status, response, ticket,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Delete menghapus pengaduan (mengembalikan file key bila ada).
func (r *Repository) Delete(ctx context.Context, ticket string) (*string, error) {
	var fileKey *string
	err := r.pool.QueryRow(ctx,
		`DELETE FROM `+r.table+` WHERE ticket_number = $1 RETURNING file_url`,
		ticket,
	).Scan(&fileKey)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return fileKey, nil
}

// StatsAggregateResult menampung hasil agregasi statistik dari satu query CTE database.
type StatsAggregateResult struct {
	Total      int              `json:"total"`
	ByStatus   map[string]int   `json:"by_status"`
	ByCategory map[string]int   `json:"by_category"`
	Last30Days []map[string]any `json:"last_30_days"`
	AvgRating  *float64         `json:"avg_rating"`
}

// GetStats mengumpulkan seluruh metrik statistik pengaduan dalam 1 round-trip query CTE tunggal.
func (r *Repository) GetStats(ctx context.Context) (*StatsAggregateResult, error) {
	query := `
		WITH stats_total AS (
			SELECT count(*) AS total_count, AVG(rating) AS avg_rating FROM ` + r.table + `
		),
		stats_status AS (
			SELECT json_object_agg(COALESCE(status, 'Lainnya'), cnt) AS by_status
			FROM (SELECT status, count(*) AS cnt FROM ` + r.table + ` GROUP BY status) s
		),
		stats_category AS (
			SELECT json_object_agg(COALESCE(category, 'Lainnya'), cnt) AS by_category
			FROM (SELECT category, count(*) AS cnt FROM ` + r.table + ` GROUP BY category) c
		),
		stats_days AS (
			SELECT COALESCE(json_agg(json_build_object('date', day, 'count', cnt) ORDER BY day), '[]'::json) AS last_30_days
			FROM (
				SELECT to_char(created_at AT TIME ZONE 'Asia/Makassar', 'YYYY-MM-DD') AS day, count(*) AS cnt
				FROM ` + r.table + `
				WHERE created_at > NOW() - INTERVAL '30 days'
				GROUP BY day
			) d
		)
		SELECT 
			st.total_count,
			st.avg_rating,
			COALESCE(ss.by_status::text, '{}'),
			COALESCE(sc.by_category::text, '{}'),
			COALESCE(sd.last_30_days::text, '[]')
		FROM stats_total st
		CROSS JOIN stats_status ss
		CROSS JOIN stats_category sc
		CROSS JOIN stats_days sd;`

	var total int
	var avgRating *float64
	var statusJSON, categoryJSON, daysJSON string

	err := r.pool.QueryRow(ctx, query).Scan(&total, &avgRating, &statusJSON, &categoryJSON, &daysJSON)
	if err != nil {
		return nil, err
	}

	byStatus := make(map[string]int)
	_ = json.Unmarshal([]byte(statusJSON), &byStatus)

	byCategory := make(map[string]int)
	_ = json.Unmarshal([]byte(categoryJSON), &byCategory)

	last30Days := make([]map[string]any, 0)
	_ = json.Unmarshal([]byte(daysJSON), &last30Days)

	return &StatsAggregateResult{
		Total:      total,
		ByStatus:   byStatus,
		ByCategory: byCategory,
		Last30Days: last30Days,
		AvgRating:  avgRating,
	}, nil
}