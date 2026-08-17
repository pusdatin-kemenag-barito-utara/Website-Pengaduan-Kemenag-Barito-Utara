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

export const TURNSTILE_SITE_KEY =
  import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADR1O_LSp1lgc3km';

export interface SubmittedDetails extends TicketDetails {
  subject?: string;
  eventLocation?: string;
}
