// Klien API panel admin — memanggil backend Go via proxy Astro.
// Sesi admin dikelola cookie HttpOnly "sid"; semua request include credentials.

import type { Layanan } from './api';

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
    const msg = (body as { message?: string })?.message || `Permintaan gagal (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return body as T;
}

export async function adminLogin(email: string, password: string): Promise<AdminMe> {
  const body = await request<{ data: { email: string; role: string } }>('/api/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return body.data;
}

export async function adminLogout(): Promise<void> {
  await request<{ success: boolean }>('/api/v1/admin/logout', { method: 'POST' });
}

export async function adminMe(): Promise<AdminMe> {
  const body = await request<{ data: AdminMe }>('/api/v1/admin/me');
  return body.data;
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

export async function adminListLayanan(): Promise<Layanan[]> {
  const body = await request<{ data: Layanan[] }>('/api/v1/admin/layanan');
  return body.data;
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