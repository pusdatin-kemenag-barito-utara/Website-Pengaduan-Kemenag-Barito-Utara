import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://db.kemenag-baritoutara.com';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseSchema = process.env.NEXT_PUBLIC_PUSDATIN_SCHEMA || 'kemenag-pengaduan';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: supabaseSchema,
  },
});

export interface Pengaduan {
  id?: string;
  ticket_number: string;
  category: 'Saran' | 'Masukan' | 'Pengaduan' | 'Keluhan' | 'Informasi' | 'Tanggapan';
  service_unit: string;
  full_name?: string | null;
  phone_number: string;
  content: string;
  is_anonymous: boolean;
  status: 'Menunggu' | 'Diproses' | 'Selesai' | 'Ditolak';
  admin_response?: string | null;
  file_url?: string | null;
  rating?: number | null;
  user_feedback?: string | null;
  created_at?: string;
  updated_at?: string;
}
