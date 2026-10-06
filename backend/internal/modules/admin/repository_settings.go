package admin

import (
	"context"
	"fmt"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// SettingItem mewakili baris konfigurasi di koleksi settings.
type SettingItem struct {
	ID    string `json:"id"`
	Key   string `json:"key"`
	Value string `json:"value"`
}

// GetSettings mengambil semua konfigurasi tersimpan.
func (r *Repository) GetSettings(ctx context.Context) (map[string]string, error) {
	res, err := database.ListRecords[SettingItem](ctx, r.db, "settings", 1, 500, "", "")
	if err != nil {
		return nil, err
	}

	settings := make(map[string]string)
	for _, it := range res.Items {
		settings[it.Key] = it.Value
	}
	return settings, nil
}

// UpdateSettings menyimpan atau memperbarui daftar pengaturan.
func (r *Repository) UpdateSettings(ctx context.Context, settings map[string]string) error {
	for k, v := range settings {
		existing, err := database.FindFirst[SettingItem](ctx, r.db, "settings", fmt.Sprintf("key = '%s'", k))
		if err == nil && existing != nil {
			_, err = database.UpdateRecord[SettingItem](ctx, r.db, "settings", existing.ID, map[string]any{
				"value": v,
			})
			if err != nil {
				return err
			}
		} else {
			_, err = database.CreateRecord[SettingItem](ctx, r.db, "settings", map[string]any{
				"key":   k,
				"value": v,
			})
			if err != nil {
				return err
			}
		}
	}
	return nil
}
