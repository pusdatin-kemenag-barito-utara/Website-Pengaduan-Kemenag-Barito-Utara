-- Migration 0001: skema lengkap SI-GESIT (kemenag-pengaduan)
-- Memperbaiki temuan audit: kolom hilang, CHECK constraint, trigger updated_at, indexes.

CREATE SCHEMA IF NOT EXISTS "kemenag-pengaduan";

-- ============================================================
-- Tabel: pengaduan
-- ============================================================
CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".pengaduan (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number   VARCHAR(30) UNIQUE NOT NULL,
    category        VARCHAR(50) NOT NULL
                    CHECK (category IN ('Saran', 'Masukan', 'Pengaduan', 'Keluhan', 'Informasi', 'Tanggapan')),
    service_unit    VARCHAR(100) NOT NULL,
    full_name       VARCHAR(150),
    phone_number    VARCHAR(30) NOT NULL,
    content         TEXT NOT NULL,
    is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
    status          VARCHAR(30) NOT NULL DEFAULT 'Menunggu'
                    CHECK (status IN ('Menunggu', 'Diproses', 'Selesai', 'Ditolak')),
    admin_response  TEXT,
    file_url        TEXT,
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    user_feedback   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Upgrade tabel legacy (skema lama tanpa kolom baru): idempotent.
ALTER TABLE "kemenag-pengaduan".pengaduan ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE "kemenag-pengaduan".pengaduan ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "kemenag-pengaduan".pengaduan ADD COLUMN IF NOT EXISTS user_feedback TEXT;
ALTER TABLE "kemenag-pengaduan".pengaduan ADD COLUMN IF NOT EXISTS admin_response TEXT;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pengaduan_ticket      ON "kemenag-pengaduan".pengaduan (ticket_number);
CREATE INDEX IF NOT EXISTS idx_pengaduan_category    ON "kemenag-pengaduan".pengaduan (category);
CREATE INDEX IF NOT EXISTS idx_pengaduan_status      ON "kemenag-pengaduan".pengaduan (status);
CREATE INDEX IF NOT EXISTS idx_pengaduan_created_at  ON "kemenag-pengaduan".pengaduan (created_at DESC);

-- GIN Trigram Indexes untuk pencarian teks cepat
CREATE INDEX IF NOT EXISTS idx_pengaduan_ticket_trgm ON "kemenag-pengaduan".pengaduan USING gin (ticket_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pengaduan_name_trgm   ON "kemenag-pengaduan".pengaduan USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pengaduan_phone_trgm  ON "kemenag-pengaduan".pengaduan USING gin (phone_number gin_trgm_ops);

-- Tabel: layanan (unit layanan dinamis)
-- ============================================================
CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".layanan (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layanan_order ON "kemenag-pengaduan".layanan (order_index);

-- ============================================================
-- Tabel: sessions (session admin server-side)
-- ============================================================
CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".sessions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash   TEXT NOT NULL UNIQUE,
    admin_email  VARCHAR(150) NOT NULL,
    role         VARCHAR(50) NOT NULL DEFAULT 'super_admin_pusdatin',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON "kemenag-pengaduan".sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires   ON "kemenag-pengaduan".sessions (expires_at);

-- ============================================================
-- Trigger: updated_at otomatis
-- ============================================================
CREATE OR REPLACE FUNCTION "kemenag-pengaduan".set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pengaduan_updated_at ON "kemenag-pengaduan".pengaduan;
CREATE TRIGGER trg_pengaduan_updated_at
    BEFORE UPDATE ON "kemenag-pengaduan".pengaduan
    FOR EACH ROW EXECUTE FUNCTION "kemenag-pengaduan".set_updated_at();

DROP TRIGGER IF EXISTS trg_layanan_updated_at ON "kemenag-pengaduan".layanan;
CREATE TRIGGER trg_layanan_updated_at
    BEFORE UPDATE ON "kemenag-pengaduan".layanan
    FOR EACH ROW EXECUTE FUNCTION "kemenag-pengaduan".set_updated_at();

-- ============================================================
-- Seed: layanan awal
-- ============================================================
INSERT INTO "kemenag-pengaduan".layanan (name, description, order_index) VALUES
    ('PTSP (Pelayanan Terpadu Satu Pintu)', 'Pelayanan administrasi terpadu', 1),
    ('Sub Bagian Tata Usaha', 'Administrasi umum & kepegawaian', 2),
    ('Seksi Pendidikan Agama dan Keagamaan Islam (PAKIS)', 'Layanan pendidikan agama Islam', 3),
    ('Seksi Bimbingan Masyarakat Islam (BIMAS)', 'Bimbingan masyarakat Islam', 4),
    ('Seksi Penyelenggaraan Haji dan Umrah (PHU)', 'Layanan haji & umrah', 5),
    ('KUA Kecamatan', 'Kantor Urusan Agama kecamatan', 6)
ON CONFLICT DO NOTHING;