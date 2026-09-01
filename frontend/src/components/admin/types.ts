export type Tab =
  | 'pengaduan'
  | 'rating'
  | 'statistik'
  | 'layanan'
  | 'template'
  | 'laporan'
  | 'settings';

export const TURNSTILE_SITE_KEY =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '';

export const ITEMS_PER_PAGE = 10;
export const STATUS_OPTIONS = ['Menunggu', 'Diproses', 'Selesai', 'Ditolak'];
export const CATEGORY_OPTIONS = ['Saran', 'Masukan', 'Pengaduan', 'Keluhan', 'Informasi', 'Tanggapan'];

// ============================================================
// Rating & IKM Types
// ============================================================
export interface RatingItem {
  id: string;
  ticket_number: string;
  category: string;
  service_unit: string;
  full_name?: string | null;
  rating: number;
  user_feedback?: string | null;
  created_at: string;
}

export interface RatingStats {
  total_rated: number;
  avg_rating: number;
  ikm_score: number;
  ikm_grade: string;
  distribution: Record<string, number>;
  per_service_unit: Record<string, any>;
}

export interface RatingResult {
  items: RatingItem[];
  total: number;
  page: number;
  pages: number;
  stats: RatingStats;
}

// ============================================================
// Template Types
// ============================================================
export interface TemplateItem {
  id: string;
  title: string;
  status_target: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Settings Types
// ============================================================
export interface SystemSettings {
  office_name?: string;
  office_address?: string;
  office_phone?: string;
  helpdesk_whatsapp?: string;
  office_leader_name?: string;
  office_leader_title?: string;
  office_leader_nip?: string;
  wa_notification_template?: string;
  [key: string]: string | undefined;
}

// ============================================================
// Report Summary Types
// ============================================================
export interface ReportSummaryData {
  start_date: string;
  end_date: string;
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  by_service_unit: Record<string, number>;
  avg_rating?: number | null;
  items: any[];
  generated_at: string;
}

export function statusBadge(status: string) {
  switch (status) {
    case 'Selesai':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-500/20';
    case 'Diproses':
      return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/20';
    case 'Ditolak':
      return 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-500/20';
    default:
      return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/20';
  }
}

export function categoryBadge(cat: string) {
  switch (cat) {
    case 'Pengaduan':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Saran':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Masukan':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Keluhan':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Informasi':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Tanggapan':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}
