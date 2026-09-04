// Klien API panel admin — memanggil backend Go via proxy Astro.
// Sesi admin dikelola cookie HttpOnly "sid"; semua request include credentials.

import type { Layanan } from './api';
import type {
  RatingResult,
  ReportSummaryData,
  SystemSettings,
  TemplateItem,
} from '../components/admin/types';

export interface AdminItem {
  id: string;
  ticket_number: string;
  category: string;
  service_unit: string;
  full_name?: string | null;
  phone_number: string;
  content: string;
  is_anonymous: boolean;
  status: string;
  admin_response?: string | null;
  file_url?: string | null;
  rating?: number | null;
  user_feedback?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminListResult {
  items: AdminItem[];
  total: number;
  page: number;
  pages: number;
}

export interface AdminStats {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  last_30_days: { date: string; count: number }[];
  avg_rating?: number | null;
  generated_at: string;
}

export interface AdminMe {
  email: string;
  name?: string;
  role: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'Content-Type': 'application/json', ...init?.headers },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* body non-JSON */
  }
  if (!res.ok || (body && typeof body === 'object' && (body as { success?: boolean }).success === false)) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin:unauthorized'));
    }
    const msg = (body as { message?: string })?.message || `Permintaan gagal (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return body as T;
}

export async function adminLogin(email: string, password: string): Promise<AdminMe> {
  const body = await request<{ data: AdminMe }>('/api/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return body.data;
}

export async function adminLogout(): Promise<void> {
  await request<{ success: boolean }>('/api/v1/admin/logout', { method: 'POST' });
}

export async function adminMe(): Promise<AdminMe | null> {
  const body = await request<{ data: AdminMe | null }>('/api/v1/admin/me');
  return body?.data ?? null;
}

export async function adminListPengaduan(params: {
  page?: number;
  per_page?: number;
  status?: string;
  category?: string;
  search?: string;
}): Promise<AdminListResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.status && params.status !== 'ALL') qs.set('status', params.status);
  if (params.category && params.category !== 'ALL') qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  const body = await request<{ data: AdminListResult }>(`/api/v1/admin/pengaduan?${qs.toString()}`);
  return body.data;
}

export async function adminStats(): Promise<AdminStats> {
  const body = await request<{ data: AdminStats }>('/api/v1/admin/pengaduan/stats');
  return body.data;
}

export async function adminUpdatePengaduan(ticket: string, patch: { status?: string; admin_response?: string }): Promise<void> {
  await request<{ success: boolean }>(`/api/v1/admin/pengaduan/${encodeURIComponent(ticket)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function adminDeletePengaduan(ticket: string): Promise<void> {
  await request<{ success: boolean }>(`/api/v1/admin/pengaduan/${encodeURIComponent(ticket)}`, { method: 'DELETE' });
}

export async function adminCleanupStorage(): Promise<{ deleted_count: number; deleted_files: string[]; active_count: number; total_r2: number }> {
  const body = await request<{ data: { deleted_count: number; deleted_files: string[]; active_count: number; total_r2: number } }>('/api/v1/admin/pengaduan/cleanup-storage', {
    method: 'POST',
  });
  return body.data;
}

export async function adminListLayanan(): Promise<Layanan[]> {
  const body = await request<{ data: Layanan[] }>('/api/v1/admin/layanan', {
    cache: 'no-store',
  });
  return body.data || [];
}

export async function adminCreateLayanan(input: { name: string; description?: string; is_active: boolean }): Promise<Layanan> {
  const body = await request<{ data: Layanan }>('/api/v1/admin/layanan', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function adminUpdateLayanan(id: string, patch: { name?: string; description?: string | null; is_active?: boolean }): Promise<void> {
  await request<{ success: boolean }>(`/api/v1/admin/layanan/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function adminDeleteLayanan(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/v1/admin/layanan/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function adminReorderLayanan(ids: string[]): Promise<void> {
  await request<{ success: boolean }>('/api/v1/admin/layanan/reorder', {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
}

// ============================================================
// Ulasan & IKM API
// ============================================================
export async function adminListRatings(params: {
  page?: number;
  per_page?: number;
  star?: number;
  search?: string;
}): Promise<RatingResult> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.star && params.star > 0) qs.set('star', String(params.star));
  if (params.search) qs.set('search', params.search);
  const body = await request<{ data: RatingResult }>(`/api/v1/admin/ratings?${qs.toString()}`);
  return {
    items: body.data?.items || [],
    total: body.data?.total || 0,
    page: body.data?.page || 1,
    pages: body.data?.pages || 1,
    stats: body.data?.stats || {
      total_rated: 0,
      avg_rating: 0,
      ikm_score: 0,
      ikm_grade: 'Belum Ada Data',
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      per_service_unit: {},
    },
  };
}

// ============================================================
// Template Tanggapan API
// ============================================================
export async function adminListTemplates(): Promise<TemplateItem[]> {
  const body = await request<{ data: TemplateItem[] }>('/api/v1/admin/templates');
  return body.data || [];
}

export async function adminCreateTemplate(input: { title: string; status_target: string; content: string }): Promise<TemplateItem> {
  const body = await request<{ data: TemplateItem }>('/api/v1/admin/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data;
}

export async function adminUpdateTemplate(
  id: string,
  patch: { title?: string; status_target?: string; content?: string }
): Promise<TemplateItem> {
  const body = await request<{ data: TemplateItem }>(`/api/v1/admin/templates/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return body.data;
}

export async function adminDeleteTemplate(id: string): Promise<void> {
  await request<{ success: boolean }>(`/api/v1/admin/templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

// ============================================================
// Pengaturan Sistem API
// ============================================================
export async function adminGetSettings(): Promise<SystemSettings> {
  const body = await request<{ data: SystemSettings }>('/api/v1/admin/settings');
  return body.data || {};
}

export async function adminUpdateSettings(settings: SystemSettings): Promise<void> {
  await request<{ success: boolean }>('/api/v1/admin/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// ============================================================
// Rekap Laporan Kedinasan API
// ============================================================
export async function adminGetReportSummary(startDate?: string, endDate?: string): Promise<ReportSummaryData> {
  const qs = new URLSearchParams();
  if (startDate) qs.set('start_date', startDate);
  if (endDate) qs.set('end_date', endDate);
  const body = await request<{ data: ReportSummaryData }>(`/api/v1/admin/reports/summary?${qs.toString()}`);
  return {
    start_date: body.data?.start_date || startDate || '',
    end_date: body.data?.end_date || endDate || '',
    total: body.data?.total || 0,
    by_status: body.data?.by_status || {},
    by_category: body.data?.by_category || {},
    by_service_unit: body.data?.by_service_unit || {},
    avg_rating: body.data?.avg_rating,
    items: body.data?.items || [],
    generated_at: body.data?.generated_at || new Date().toISOString(),
  };
}