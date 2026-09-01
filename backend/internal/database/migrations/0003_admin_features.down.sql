-- Migration 0003 Down: Rollback fitur lengkap admin panel
DROP TABLE IF EXISTS "kemenag-pengaduan".settings;
DROP TABLE IF EXISTS "kemenag-pengaduan".templates;
