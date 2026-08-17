package admin

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// ErrNotFound menandai pengaduan tidak ditemukan.
var ErrNotFound = errors.New("record not found")

// ListFilter untuk query daftar pengaduan.
type ListFilter struct {
	Status   string
	Category string
	Search   string
	Page     int
	PerPage  int
}

// ListResult berisi data + pagination.
type ListResult struct {
	Items []Item `json:"items"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
	Pages int    `json:"pages"`
}

// Item adalah pengaduan untuk tampilan admin.
type Item struct {
	ID            string    `json:"id"`
	TicketNumber  string    `json:"ticket_number"`
	Category      string    `json:"category"`
	ServiceUnit   string    `json:"service_unit"`
	FullName      *string   `json:"full_name,omitempty"`
	PhoneNumber   string    `json:"phone_number"`
	Content       string    `json:"content"`
	IsAnonymous   bool      `json:"is_anonymous"`
	Status        string    `json:"status"`
	AdminResponse *string   `json:"admin_response,omitempty"`
	FileKey       *string   `json:"file_url,omitempty"`
	Rating        *int16    `json:"rating,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Repository mengakses pengaduan untuk panel admin.
type Repository struct {
	pool  *pgxpool.Pool
	table string
	log   *slog.Logger
}

// NewRepository membuat Repository admin.
func NewRepository(pool *pgxpool.Pool, schema string, log *slog.Logger) *Repository {
	return &Repository{
		pool:  pool,
		table: fmt.Sprintf("%q.%q", schema, "pengaduan"),
		log:   log,
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
			file_url, rating, created_at, updated_at
		FROM `+r.table+where+`
		ORDER BY created_at DESC
		LIMIT $`+fmt.Sprint(len(args)-1)+` OFFSET $`+fmt.Sprint(len(args)),
		args...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []Item
	for rows.Next() {
		var it Item
		if err := rows.Scan(
			&it.ID, &it.TicketNumber, &it.Category, &it.ServiceUnit, &it.FullName,
			&it.PhoneNumber, &it.Content, &it.IsAnonymous, &it.Status, &it.AdminResponse,
			&it.FileKey, &it.Rating, &it.CreatedAt, &it.UpdatedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, it)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Total untuk pagination (hitung ulang tanpa limit).
	var total int
	countArgs := args[:len(args)-2]
	countQuery := `SELECT count(*) FROM ` + r.table + where
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	pages := (total + f.PerPage - 1) / f.PerPage
	return &ListResult{Items: items, Total: total, Page: f.Page, Pages: pages}, nil
}

// UpdateStatusAndResponse memperbarui status dan tanggapan admin.
func (r *Repository) UpdateStatusAndResponse(ctx context.Context, ticket, status string, response *string) error {
	ct, err := r.pool.Exec(ctx, `
		UPDATE `+r.table+`
		SET status = $1,
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

// ValidateStatus memeriksa status yang diizinkan.
func ValidateStatus(s string) bool { return validate.Status(s) }