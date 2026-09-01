package admin

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// ListTemplates mengambil seluruh template tanggapan.
func (r *Repository) ListTemplates(ctx context.Context) ([]Template, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id::text, title, status_target, content, created_at, updated_at
		FROM `+r.templatesTable+`
		ORDER BY created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]Template, 0)
	for rows.Next() {
		var t Template
		if err := rows.Scan(&t.ID, &t.Title, &t.StatusTarget, &t.Content, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, t)
	}
	return items, rows.Err()
}

// CreateTemplate menambahkan template tanggapan baru.
func (r *Repository) CreateTemplate(ctx context.Context, title, statusTarget, content string) (*Template, error) {
	var t Template
	err := r.pool.QueryRow(ctx, `
		INSERT INTO `+r.templatesTable+` (title, status_target, content)
		VALUES ($1, $2, $3)
		RETURNING id::text, title, status_target, content, created_at, updated_at`,
		title, statusTarget, content,
	).Scan(&t.ID, &t.Title, &t.StatusTarget, &t.Content, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// UpdateTemplate mengubah template tanggapan.
func (r *Repository) UpdateTemplate(ctx context.Context, id uuid.UUID, title, statusTarget, content *string) (*Template, error) {
	var t Template
	err := r.pool.QueryRow(ctx, `
		UPDATE `+r.templatesTable+`
		SET title = CASE WHEN $1::text IS NOT NULL THEN $1 ELSE title END,
			status_target = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE status_target END,
			content = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE content END,
			updated_at = NOW()
		WHERE id = $4
		RETURNING id::text, title, status_target, content, created_at, updated_at`,
		title, statusTarget, content, id,
	).Scan(&t.ID, &t.Title, &t.StatusTarget, &t.Content, &t.CreatedAt, &t.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

// DeleteTemplate menghapus template tanggapan.
func (r *Repository) DeleteTemplate(ctx context.Context, id uuid.UUID) error {
	ct, err := r.pool.Exec(ctx, `DELETE FROM `+r.templatesTable+` WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
