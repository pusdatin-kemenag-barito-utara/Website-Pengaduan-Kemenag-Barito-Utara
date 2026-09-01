-- Migration 0002: Autentikasi Mandiri Super Admin
-- Membuat tabel login_attempts lokal di schema kemenag-pengaduan

CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".login_attempts (
    ip_address    VARCHAR(45) PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lockout_until TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_lockout ON "kemenag-pengaduan".login_attempts (lockout_until);
