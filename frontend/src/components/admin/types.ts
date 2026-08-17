export type Tab = 'pengaduan' | 'layanan' | 'statistik';

export const TURNSTILE_SITE_KEY =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADR1O_LSp1lgc3km';

export const ITEMS_PER_PAGE = 10;
export const STATUS_OPTIONS = ['Menunggu', 'Diproses', 'Selesai', 'Ditolak'];
export const CATEGORY_OPTIONS = ['Saran', 'Masukan', 'Pengaduan', 'Keluhan', 'Informasi', 'Tanggapan'];

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
