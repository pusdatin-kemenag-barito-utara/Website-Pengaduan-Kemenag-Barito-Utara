-- Rollback migration 0001
DROP TRIGGER IF EXISTS trg_layanan_updated_at ON "kemenag-pengaduan".layanan;
DROP TRIGGER IF EXISTS trg_pengaduan_updated_at ON "kemenag-pengaduan".pengaduan;
DROP FUNCTION IF EXISTS "kemenag-pengaduan".set_updated_at();
DROP TABLE IF EXISTS "kemenag-pengaduan".sessions;
DROP TABLE IF EXISTS "kemenag-pengaduan".layanan;
DROP TABLE IF EXISTS "kemenag-pengaduan".pengaduan;
DROP SCHEMA IF EXISTS "kemenag-pengaduan";