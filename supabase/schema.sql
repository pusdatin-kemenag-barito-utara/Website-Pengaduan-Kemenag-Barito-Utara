-- Schema SQL untuk SI-GESIT (Pengaduan Kemenag Barito Utara)
-- Schema: kemenag-pengaduan

CREATE SCHEMA IF NOT EXISTS "kemenag-pengaduan";

CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".pengaduan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(30) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL, -- Saran, Masukan, Pengaduan, Keluhan, Informasi, Tanggapan
  service_unit VARCHAR(100) NOT NULL, -- PTSP, Sub Tata Usaha, dll
  full_name VARCHAR(150),
  phone_number VARCHAR(30) NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  status VARCHAR(30) DEFAULT 'Menunggu', -- Menunggu, Diproses, Selesai, Ditolak
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk kecepatan query
CREATE INDEX IF NOT EXISTS idx_pengaduan_ticket ON "kemenag-pengaduan".pengaduan(ticket_number);
CREATE INDEX IF NOT EXISTS idx_pengaduan_category ON "kemenag-pengaduan".pengaduan(category);
CREATE INDEX IF NOT EXISTS idx_pengaduan_created_at ON "kemenag-pengaduan".pengaduan(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE "kemenag-pengaduan".pengaduan ENABLE ROW LEVEL SECURITY;

-- Allow public insertion & selection
CREATE POLICY "Allow public insert" ON "kemenag-pengaduan".pengaduan
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select by ticket" ON "kemenag-pengaduan".pengaduan
  FOR SELECT USING (true);

CREATE POLICY "Allow full access for authenticated/anon users" ON "kemenag-pengaduan".pengaduan
  FOR ALL USING (true);
