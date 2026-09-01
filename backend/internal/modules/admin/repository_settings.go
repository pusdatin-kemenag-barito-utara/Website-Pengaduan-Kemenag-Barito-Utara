package admin

import (
	"context"
)

// GetSettings mengambil semua konfigurasi tersimpan.
func (r *Repository) GetSettings(ctx context.Context) (map[string]string, error) {
	rows, err := r.pool.Query(ctx, `SELECT key, value FROM `+r.settingsTable)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err == nil {
			settings[k] = v
		}
	}
	return settings, rows.Err()
}

// UpdateSettings menyimpan atau memperbarui daftar pengaturan.
func (r *Repository) UpdateSettings(ctx context.Context, settings map[string]string) error {
	for k, v := range settings {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO `+r.settingsTable+` (key, value, updated_at)
			VALUES ($1, $2, NOW())
			ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
			k, v,
		)
		if err != nil {
			return err
		}
	}
	return nil
}
