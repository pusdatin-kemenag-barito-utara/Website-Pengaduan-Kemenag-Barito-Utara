-- Schema SQL untuk SI-GESIT (Pengaduan Kemenag)
-- Silakan jalankan script ini di Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.pengaduan (
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
CREATE INDEX IF NOT EXISTS idx_pengaduan_ticket ON public.pengaduan(ticket_number);
CREATE INDEX IF NOT EXISTS idx_pengaduan_category ON public.pengaduan(category);
CREATE INDEX IF NOT EXISTS idx_pengaduan_created_at ON public.pengaduan(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.pengaduan ENABLE ROW LEVEL SECURITY;

-- Allow public insertion
CREATE POLICY "Allow public insert" ON public.pengaduan
  FOR INSERT WITH CHECK (true);

-- Allow public to select by ticket_number
CREATE POLICY "Allow public select by ticket" ON public.pengaduan
  FOR SELECT USING (true);

-- Allow all operations for admin/anon during dev
CREATE POLICY "Allow full access for authenticated/anon users" ON public.pengaduan
  FOR ALL USING (true);
