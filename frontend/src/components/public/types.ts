import {
  AlertCircle, Info, MessageCircle, MessageSquare, ShieldAlert, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { TicketDetails } from '../../lib/ticketCanvas';

export interface CategoryOption {
  id: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const CATEGORIES: CategoryOption[] = [
  { id: 'Saran', label: 'Saran', icon: Sparkles, desc: 'Usulan perbaikan layanan' },
  { id: 'Masukan', label: 'Masukan', icon: MessageSquare, desc: 'Pandangan konstruktif' },
  { id: 'Pengaduan', label: 'Pengaduan', icon: AlertCircle, desc: 'Laporan ketidaksesuaian' },
  { id: 'Keluhan', label: 'Keluhan', icon: ShieldAlert, desc: 'Kekecewaan pelayanan' },
  { id: 'Informasi', label: 'Informasi', icon: Info, desc: 'Permohonan keterangan' },
  { id: 'Tanggapan', label: 'Tanggapan', icon: MessageCircle, desc: 'Respon kebijakan' },
];

export const getTurnstileSiteKey = (): string => {
  if (typeof window !== 'undefined' && (window as any).__PUBLIC_TURNSTILE_SITE_KEY__) {
    return (window as any).__PUBLIC_TURNSTILE_SITE_KEY__;
  }
  return (
    (typeof process !== 'undefined' && process.env?.PUBLIC_TURNSTILE_SITE_KEY) ||
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
    ''
  );
};

export const TURNSTILE_SITE_KEY = getTurnstileSiteKey();

export interface SubmittedDetails extends TicketDetails {
  subject?: string;
  eventLocation?: string;
}
