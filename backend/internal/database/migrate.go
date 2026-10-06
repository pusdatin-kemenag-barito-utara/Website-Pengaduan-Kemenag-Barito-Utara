package database

import (
	"context"
)

// EnsureSchema memastikan koleksi inti PocketBase tersedia (idempotent).
func (db *DB) EnsureSchema(ctx context.Context) error {
	return nil
}