import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  created_at?: string;
  updated_at?: string;
}
