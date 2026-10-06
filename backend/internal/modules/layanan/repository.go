package layanan

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// ErrNotFound menandai layanan tidak ditemukan.
var ErrNotFound = database.ErrNotFound

// Layanan adalah unit layanan dinamis.
type Layanan struct {
	ID          string  `json:"id"`
	OriginalID  string  `json:"original_id,omitempty"`
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
	IsActive    bool    `json:"is_active"`
	OrderIndex  int     `json:"order_index"`
}

// Repository mengakses koleksi layanan PocketBase.
type Repository struct {
	db  *database.DB
	log *slog.Logger
}

// NewRepository membuat Repository layanan dengan PocketBase.
func NewRepository(db *database.DB, log *slog.Logger) *Repository {
	return &Repository{
		db:  db,
		log: log,
	}
}

// ListActive mengambil layanan aktif terurut secara dinamis dari database.
func (r *Repository) ListActive(ctx context.Context) ([]Layanan, error) {
	if r.db == nil {
		return []Layanan{}, fmt.Errorf("database client nil")
	}
	res, err := database.ListRecords[Layanan](ctx, r.db, "layanan", 1, 500, "is_active = true", "order_index,name")
	if err != nil {
		return nil, err
	}
	if res.Items == nil {
		return []Layanan{}, nil
	}
	return res.Items, nil
}

// ListAll mengambil seluruh layanan (admin).
func (r *Repository) ListAll(ctx context.Context) ([]Layanan, error) {
	if r.db == nil {
		return []Layanan{}, fmt.Errorf("database client nil")
	}
	res, err := database.ListRecords[Layanan](ctx, r.db, "layanan", 1, 500, "", "order_index,name")
	if err != nil {
		return nil, err
	}
	if res.Items == nil {
		return []Layanan{}, nil
	}
	return res.Items, nil
}

// FindByID mengambil satu layanan berdasarkan ID PocketBase atau UUID original.
func (r *Repository) FindByID(ctx context.Context, id string) (*Layanan, error) {
	item, err := database.GetRecord[Layanan](ctx, r.db, "layanan", id)
	if err == nil {
		return item, nil
	}
	// Fallback pencarian via original_id
	return database.FindFirst[Layanan](ctx, r.db, "layanan", fmt.Sprintf("original_id = '%s'", id))
}

// Create menyisipkan layanan baru.
func (r *Repository) Create(ctx context.Context, l *Layanan) error {
	if l.OrderIndex <= 0 {
		all, _ := r.ListAll(ctx)
		maxIndex := 0
		for _, item := range all {
			if item.OrderIndex > maxIndex {
				maxIndex = item.OrderIndex
			}
		}
		l.OrderIndex = maxIndex + 1
	}
	created, err := database.CreateRecord[Layanan](ctx, r.db, "layanan", l)
	if err != nil {
		return err
	}
	l.ID = created.ID
	return nil
}

// Update memperbarui layanan.
func (r *Repository) Update(ctx context.Context, l *Layanan) error {
	_, err := database.UpdateRecord[Layanan](ctx, r.db, "layanan", l.ID, l)
	return err
}

// Delete menghapus layanan.
func (r *Repository) Delete(ctx context.Context, id string) error {
	rec, err := r.FindByID(ctx, id)
	if err != nil {
		return err
	}
	return database.DeleteRecord(ctx, r.db, "layanan", rec.ID)
}

// Reorder memperbarui urutan layanan.
func (r *Repository) Reorder(ctx context.Context, ids []string) error {
	for i, id := range ids {
		rec, err := r.FindByID(ctx, id)
		if err != nil {
			continue
		}
		_, _ = database.UpdateRecord[Layanan](ctx, r.db, "layanan", rec.ID, map[string]any{
			"order_index": i + 1,
		})
	}
	return nil
}

// Normalize membersihkan input nama.
func Normalize(name string) string {
	return strings.TrimSpace(name)
}