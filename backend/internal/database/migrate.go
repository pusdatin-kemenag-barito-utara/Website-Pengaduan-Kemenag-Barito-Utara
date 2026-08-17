package database

import (
	"context"
	"embed"
	"fmt"
	"sort"
	"strings"
)

//go:embed migrations/*.up.sql
var migrationsFS embed.FS

// Migrate menjalankan seluruh migration .up.sql yang belum teraplikasi,
// dengan pencatatan versi di tabel schema_migrations pada schema aplikasi.
func (d *DB) Migrate(ctx context.Context) error {
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("baca direktori migrations: %w", err)
	}

	var files []string
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".up.sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	if _, err := d.Pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("buat tabel schema_migrations: %w", err)
	}

	for _, file := range files {
		var exists bool
		err := d.Pool.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)`, file,
		).Scan(&exists)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		sqlBytes, err := migrationsFS.ReadFile("migrations/" + file)
		if err != nil {
			return err
		}

		if err := d.applyMigration(ctx, file, string(sqlBytes)); err != nil {
			return fmt.Errorf("gagal apply %s: %w", file, err)
		}
	}

	return nil
}

func (d *DB) applyMigration(ctx context.Context, version, sql string) error {
	conn, err := d.Pool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer conn.Release()

	// Simple protocol: mendukung multi-statement dalam satu file migrasi
	// dan bebas dari konflik statement cache pada koneksi yang dipakai ulang.
	if _, err := conn.Conn().PgConn().Exec(ctx, sql).ReadAll(); err != nil {
		return err
	}
	_, err = conn.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, version)
	return err
}