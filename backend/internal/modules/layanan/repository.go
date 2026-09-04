package layanan

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// ErrNotFound menandai layanan tidak ditemukan.
var ErrNotFound = errors.New("record not found")

// Layanan adalah unit layanan dinamis.
type Layanan struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	IsActive    bool      `json:"is_active"`
	OrderIndex  int       `json:"order_index"`
}

// Repository mengakses tabel layanan.
type Repository struct {
	pool *pgxpool.Pool
	table string
	log  *slog.Logger
}

// NewRepository membuat Repository dengan tabel memenuhi syarat schema.
func NewRepository(pool *pgxpool.Pool, schema string, log *slog.Logger) *Repository {
	return &Repository{
		pool:  pool,
		table: fmt.Sprintf("%q.%q", schema, "layanan"),
		log:   log,
	}
}

// ListActive mengambil layanan aktif terurut secara dinamis dari database.
func (r *Repository) ListActive(ctx context.Context) ([]Layanan, error) {
	if r.pool == nil {
		return []Layanan{}, fmt.Errorf("database connection pool nil")
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, description, is_active, order_index
		FROM `+r.table+` WHERE is_active = TRUE ORDER BY order_index ASC, name ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Layanan, 0)
	for rows.Next() {
		var l Layanan
		if err := rows.Scan(&l.ID, &l.Name, &l.Description, &l.IsActive, &l.OrderIndex); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// ListAll mengambil seluruh layanan (admin).
func (r *Repository) ListAll(ctx context.Context) ([]Layanan, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, description, is_active, order_index
		FROM `+r.table+` ORDER BY order_index, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []Layanan
	for rows.Next() {
		var l Layanan
		if err := rows.Scan(&l.ID, &l.Name, &l.Description, &l.IsActive, &l.OrderIndex); err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

// FindByID mengambil satu layanan.
func (r *Repository) FindByID(ctx context.Context, id uuid.UUID) (*Layanan, error) {
	var l Layanan
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, description, is_active, order_index
		FROM `+r.table+` WHERE id = $1`, id,
	).Scan(&l.ID, &l.Name, &l.Description, &l.IsActive, &l.OrderIndex)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &l, nil
}

// Create menyisipkan layanan baru.
func (r *Repository) Create(ctx context.Context, l *Layanan) error {
	if l.OrderIndex <= 0 {
		var nextIndex int
		row := r.pool.QueryRow(ctx, `SELECT COALESCE(MAX(order_index), 0) + 1 FROM `+r.table)
		if err := row.Scan(&nextIndex); err == nil && nextIndex > 0 {
			l.OrderIndex = nextIndex
		} else {
			l.OrderIndex = 1
		}
	}
	err := r.pool.QueryRow(ctx, `
		INSERT INTO `+r.table+` (name, description, is_active, order_index)
		VALUES ($1, $2, $3, $4) RETURNING id`,
		l.Name, l.Description, l.IsActive, l.OrderIndex,
	).Scan(&l.ID)
	return err
}

// Update memperbarui layanan.
func (r *Repository) Update(ctx context.Context, l *Layanan) error {
	ct, err := r.pool.Exec(ctx, `
		UPDATE `+r.table+`
		SET name = $1, description = $2, is_active = $3, order_index = $4
		WHERE id = $5`,
		l.Name, l.Description, l.IsActive, l.OrderIndex, l.ID)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Delete menghapus layanan.
func (r *Repository) Delete(ctx context.Context, id uuid.UUID) error {
	ct, err := r.pool.Exec(ctx, `DELETE FROM `+r.table+` WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// Reorder memperbarui urutan layanan dalam satu transaksi.
func (r *Repository) Reorder(ctx context.Context, ids []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i, id := range ids {
		_, err := tx.Exec(ctx, `
			UPDATE `+r.table+` SET order_index = $1 WHERE id = $2`, i+1, id)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// Normalize membersihkan input nama.
func Normalize(name string) string {
	return strings.TrimSpace(name)
}