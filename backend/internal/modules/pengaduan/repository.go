package pengaduan

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

var (
	// ErrUniqueViolation terjadi saat benturan constraint UNIQUE.
	ErrUniqueViolation = errors.New("unique constraint violation")
	// ErrNotFound terjadi saat data tidak ditemukan.
	ErrNotFound = errors.New("record not found")
)

// Repository mengakses tabel pengaduan.
type Repository struct {
	db *database.DB
}

// NewRepository membuat Repository.
func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

// Create menyisipkan pengaduan baru.
func (r *Repository) Create(ctx context.Context, e *Entity) error {
	_, err := r.db.Pool.Exec(ctx, `
		INSERT INTO `+r.db.Table("pengaduan")+` (
			id, ticket_number, category, service_unit, full_name,
			phone_number, content, is_anonymous, status, file_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		e.ID, e.TicketNumber, e.Category, e.ServiceUnit, e.FullName,
		e.PhoneNumber, e.Content, e.IsAnonymous, e.Status, e.FileKey,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return ErrUniqueViolation
		}
		return fmt.Errorf("insert pengaduan: %w", err)
	}
	return nil
}

// SetFileURL mencatat key file R2 setelah upload berhasil.
func (r *Repository) SetFileURL(ctx context.Context, id interface{}, fileKey *string) error {
	_, err := r.db.Pool.Exec(ctx,
		`UPDATE `+r.db.Table("pengaduan")+` SET file_url = $1 WHERE id = $2`, fileKey, id)
	if err != nil {
		return fmt.Errorf("update file_url: %w", err)
	}
	return nil
}

// Delete menghapus pengaduan (digunakan rollback saat upload gagal).
func (r *Repository) Delete(ctx context.Context, id interface{}) error {
	_, err := r.db.Pool.Exec(ctx, `DELETE FROM `+r.db.Table("pengaduan")+` WHERE id = $1`, id)
	return err
}

// FindByTicket mengambil pengaduan berdasarkan nomor tiket.
func (r *Repository) FindByTicket(ctx context.Context, ticket string) (*Entity, error) {
	row := r.db.Pool.QueryRow(ctx, `
		SELECT id, ticket_number, category, service_unit, full_name,
			phone_number, content, is_anonymous, status, admin_response,
			file_url, rating, user_feedback, created_at, updated_at
		FROM `+r.db.Table("pengaduan")+` WHERE ticket_number = $1`, ticket)

	var e Entity
	err := row.Scan(
		&e.ID, &e.TicketNumber, &e.Category, &e.ServiceUnit, &e.FullName,
		&e.PhoneNumber, &e.Content, &e.IsAnonymous, &e.Status, &e.AdminResponse,
		&e.FileKey, &e.Rating, &e.UserFeedback, &e.CreatedAt, &e.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("query pengaduan: %w", err)
	}
	return &e, nil
}