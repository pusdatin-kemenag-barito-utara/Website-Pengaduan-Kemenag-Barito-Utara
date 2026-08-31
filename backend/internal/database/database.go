package database

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// DB membungkus pgx pool dengan skema aplikasi sebagai search_path.
type DB struct {
	Pool   *pgxpool.Pool
	Schema string
}

// Connect membuat koneksi pool ke Postgres dan menetapkan search_path
// ke schema aplikasi (mis. kemenag-pengaduan).
func Connect(ctx context.Context, dsn, schema string) (*DB, error) {
	// PgBouncer/pooler mengabaikan startup param search_path; gunakan
	// param options yang diizinkan pooler: options=-csearch_path=<schema>.
	if u, err := url.Parse(dsn); err == nil {
		q := u.Query()
		if q.Get("options") == "" {
			q.Set("options", "-csearch_path="+schema)
			u.RawQuery = q.Encode()
			dsn = u.String()
		}
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}

	cfg.ConnConfig.RuntimeParams = map[string]string{
		"search_path": schema,
	}

	// Simple protocol: tanpa prepared statement cache sehingga aman saat
	// koneksi pool dipakai ulang lintas eksekusi (migrasi & aplikasi),
	// dan mendukung multi-statement migrasi secara alami.
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	cfg.ConnConfig.ConnectTimeout = 5 * time.Second

	// Pool Tuning: Pre-warm koneksi agar request pertama & concurrent instan
	cfg.MinConns = 4
	cfg.MaxConns = 25
	cfg.MaxConnIdleTime = 30 * time.Minute
	cfg.MaxConnLifetime = 1 * time.Hour
	cfg.HealthCheckPeriod = 1 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return &DB{Pool: pool, Schema: schema}, nil
}

// Ping memastikan koneksi masih hidup.
func (d *DB) Ping(ctx context.Context) error {
	return d.Pool.Ping(ctx)
}

// Table mengembalikan nama tabel yang memenuhi syarat schema,
// mis. "kemenag-pengaduan"."pengaduan". Dipakai karena pooler
// (PgBouncer/Supavisor) mengabaikan search_path startup.
func (d *DB) Table(name string) string {
	return fmt.Sprintf("%q.%q", d.Schema, name)
}

// Close menutup pool.
func (d *DB) Close() {
	d.Pool.Close()
}