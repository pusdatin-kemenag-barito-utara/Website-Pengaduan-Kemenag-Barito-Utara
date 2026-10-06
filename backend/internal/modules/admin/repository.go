package admin

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// Repository mengakses database modul admin via PocketBase.
type Repository struct {
	db  *database.DB
	log *slog.Logger
}

// NewRepository membuat Repository admin.
func NewRepository(db *database.DB, log *slog.Logger) *Repository {
	return &Repository{
		db:  db,
		log: log,
	}
}

// List mengambil halaman pengaduan dengan filter.
func (r *Repository) List(ctx context.Context, f ListFilter) (*ListResult, error) {
	filters := []string{}
	if f.Status != "" {
		filters = append(filters, fmt.Sprintf("status = '%s'", f.Status))
	}
	if f.Category != "" {
		filters = append(filters, fmt.Sprintf("category = '%s'", f.Category))
	}
	if f.Search != "" {
		filters = append(filters, fmt.Sprintf("(ticket_number ~ '%s' || full_name ~ '%s' || phone_number ~ '%s')", f.Search, f.Search, f.Search))
	}

	filterStr := strings.Join(filters, " && ")
	res, err := database.ListRecords[Item](ctx, r.db, "pengaduan", f.Page, f.PerPage, filterStr, "-created_at")
	if err != nil {
		return nil, err
	}

	for i := range res.Items {
		normalizeItemDates(&res.Items[i])
	}

	return &ListResult{
		Items: res.Items,
		Total: res.TotalItems,
		Page:  res.Page,
		Pages: res.TotalPages,
	}, nil
}

// FindByTicket mengambil satu pengaduan berdasarkan nomor tiket.
func (r *Repository) FindByTicket(ctx context.Context, ticket string) (*Item, error) {
	it, err := database.FindFirst[Item](ctx, r.db, "pengaduan", fmt.Sprintf("ticket_number = '%s'", ticket))
	if err == nil && it != nil {
		normalizeItemDates(it)
	}
	return it, err
}

func normalizeItemDates(it *Item) {
	if it == nil {
		return
	}
	if it.CreatedAt.Time().IsZero() {
		if len(it.TicketNumber) >= 12 && strings.HasPrefix(it.TicketNumber, "SGT-") {
			if parsed, err := time.Parse("20060102", it.TicketNumber[4:12]); err == nil {
				it.CreatedAt = database.PBTime(parsed)
			}
		}
		if it.CreatedAt.Time().IsZero() {
			it.CreatedAt = it.UpdatedAt
		}
	}
}

// GetAllFileKeys mengambil semua file_url aktif dari koleksi pengaduan.
func (r *Repository) GetAllFileKeys(ctx context.Context) ([]string, error) {
	res, err := database.ListRecords[Item](ctx, r.db, "pengaduan", 1, 5000, "file_url != ''", "")
	if err != nil {
		return nil, err
	}
	keys := make([]string, 0)
	for _, it := range res.Items {
		if it.FileKey != nil && *it.FileKey != "" {
			keys = append(keys, *it.FileKey)
		}
	}
	return keys, nil
}

// UpdateStatusAndResponse memperbarui status dan tanggapan admin.
func (r *Repository) UpdateStatusAndResponse(ctx context.Context, ticket, status string, response *string) error {
	it, err := r.FindByTicket(ctx, ticket)
	if err != nil {
		return err
	}

	updateData := map[string]any{}
	if status != "" {
		updateData["status"] = status
	}
	if response != nil {
		updateData["admin_response"] = *response
	}

	_, err = database.UpdateRecord[Item](ctx, r.db, "pengaduan", it.ID, updateData)
	return err
}

// Delete menghapus pengaduan (mengembalikan file key bila ada).
func (r *Repository) Delete(ctx context.Context, ticket string) (*string, error) {
	it, err := r.FindByTicket(ctx, ticket)
	if err != nil {
		return nil, err
	}
	fileKey := it.FileKey
	err = database.DeleteRecord(ctx, r.db, "pengaduan", it.ID)
	return fileKey, err
}

// StatsAggregateResult menampung hasil agregasi statistik.
type StatsAggregateResult struct {
	Total      int              `json:"total"`
	ByStatus   map[string]int   `json:"by_status"`
	ByCategory map[string]int   `json:"by_category"`
	Last30Days []map[string]any `json:"last_30_days"`
	AvgRating  *float64         `json:"avg_rating"`
}

// GetStats mengumpulkan seluruh metrik statistik pengaduan.
func (r *Repository) GetStats(ctx context.Context) (*StatsAggregateResult, error) {
	res, err := database.ListRecords[Item](ctx, r.db, "pengaduan", 1, 5000, "", "-created_at")
	if err != nil {
		return nil, err
	}

	byStatus := make(map[string]int)
	byCategory := make(map[string]int)
	byDays := make(map[string]int)
	var ratingSum float64
	var ratingCount int

	thirtyDaysAgo := time.Now().Add(-30 * 24 * time.Hour)

	for _, it := range res.Items {
		byStatus[it.Status]++
		byCategory[it.Category]++

		t := it.CreatedAt.Time()
		if t.IsZero() {
			if len(it.TicketNumber) >= 12 && strings.HasPrefix(it.TicketNumber, "SGT-") {
				if parsed, err := time.Parse("20060102", it.TicketNumber[4:12]); err == nil {
					t = parsed
				}
			}
			if t.IsZero() {
				t = it.UpdatedAt.Time()
			}
		}
		if t.After(thirtyDaysAgo) {
			dayStr := t.Format("2006-01-02")
			byDays[dayStr]++
		}

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

	last30Days := make([]map[string]any, 0)
	for d := 29; d >= 0; d-- {
		dt := time.Now().Add(time.Duration(-d) * 24 * time.Hour)
		dayStr := dt.Format("2006-01-02")
		last30Days = append(last30Days, map[string]any{
			"date":  dayStr,
			"count": byDays[dayStr],
		})
	}

	return &StatsAggregateResult{
		Total:      res.TotalItems,
		ByStatus:   byStatus,
		ByCategory: byCategory,
		Last30Days: last30Days,
		AvgRating:  avgRating,
	}, nil
}