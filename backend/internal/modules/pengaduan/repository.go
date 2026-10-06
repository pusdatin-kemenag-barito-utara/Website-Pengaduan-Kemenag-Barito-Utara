package pengaduan

import (
	"context"
	"fmt"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

var (
	// ErrUniqueViolation terjadi saat benturan constraint UNIQUE nomor tiket.
	ErrUniqueViolation = database.ErrUniqueViolation
	// ErrNotFound terjadi saat data pengaduan tidak ditemukan.
	ErrNotFound = database.ErrNotFound
)

// Repository mengakses koleksi pengaduan PocketBase.
type Repository struct {
	db *database.DB
}

// NewRepository membuat Repository pengaduan.
func NewRepository(db *database.DB) *Repository { return &Repository{db: db} }

// Create menyisipkan pengaduan baru.
func (r *Repository) Create(ctx context.Context, e *Entity) error {
	// Cek apakah nomor tiket bentrok
	existing, err := database.FindFirst[Entity](ctx, r.db, "pengaduan", fmt.Sprintf("ticket_number = '%s'", e.TicketNumber))
	if err == nil && existing != nil {
		return ErrUniqueViolation
	}

	created, err := database.CreateRecord[Entity](ctx, r.db, "pengaduan", e)
	if err != nil {
		return err
	}
	e.ID = created.ID
	e.CreatedAt = created.CreatedAt
	e.UpdatedAt = created.UpdatedAt
	return nil
}

// SetFileURL mencatat key file R2 setelah upload berhasil.
func (r *Repository) SetFileURL(ctx context.Context, id interface{}, fileKey *string) error {
	idStr := fmt.Sprint(id)
	_, err := database.UpdateRecord[Entity](ctx, r.db, "pengaduan", idStr, map[string]any{
		"file_url": fileKey,
	})
	return err
}

// Delete menghapus pengaduan (digunakan rollback saat upload gagal).
func (r *Repository) Delete(ctx context.Context, id interface{}) error {
	idStr := fmt.Sprint(id)
	return database.DeleteRecord(ctx, r.db, "pengaduan", idStr)
}

// FindByTicket mengambil pengaduan berdasarkan nomor tiket.
func (r *Repository) FindByTicket(ctx context.Context, ticket string) (*Entity, error) {
	return database.FindFirst[Entity](ctx, r.db, "pengaduan", fmt.Sprintf("ticket_number = '%s'", ticket))
}