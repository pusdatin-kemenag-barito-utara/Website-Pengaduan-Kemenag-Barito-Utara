// Klien API publik SI-GESIT — memanggil backend Go via proxy Astro (src/fetch.ts).
// Semua path relatif agar satu origin (cookie sesi aman, tanpa CORS).

export interface Layanan {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
}

export interface TrackResult {
  ticket_number: string;
  category: string;
  service_unit: string;
  full_name?: string | null;
  phone_hint: string;
  content: string;
  is_anonymous: boolean;
  status: string;
  admin_response?: string | null;
  rating?: number | null;
  user_feedback?: string | null;
  created_at: string;
  updated_at: string;
  file_url?: string | null;
}

export interface SubmitResult {
  success: boolean;
  message: string;
  ticket_number?: string;
}

export interface ApiError {
  success: false;
  error?: string;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* body non-JSON */
  }
  if (!res.ok || (body && typeof body === 'object' && (body as ApiError).success === false)) {
    const msg = (body as ApiError)?.message || `Permintaan gagal (HTTP ${res.status}).`;
    throw new Error(msg);
  }
  return body as T;
}

export async function getLayananList(): Promise<Layanan[]> {
  const body = await request<{ data: Layanan[] }>('/api/v1/layanan');
  return body.data || [];
}

export async function submitPengaduan(formData: FormData): Promise<SubmitResult> {
  const body = await request<{ success: boolean; data: { ticket_number: string; message: string } }>(
    '/api/v1/pengaduan',
    { method: 'POST', body: formData },
  );
  return { success: true, message: body.data.message, ticket_number: body.data.ticket_number };
}

export async function checkTicketStatus(ticket: string): Promise<TrackResult> {
  const body = await request<{ data: TrackResult }>(`/api/v1/pengaduan/${encodeURIComponent(ticket)}`);
  return body.data;
}

export async function submitRating(ticket: string, rating: number, feedback: string): Promise<string> {
  const body = await request<{ message: string }>(`/api/v1/pengaduan/${encodeURIComponent(ticket)}/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, feedback }),
  });
  return body.message;
}

export interface AppStatusResult {
  success: boolean;
  is_maintenance: boolean;
  status: 'online' | 'maintenance';
  app_name: string;
}

export async function getAppStatus(): Promise<AppStatusResult> {
  try {
    const body = await request<AppStatusResult>('/api/v1/app-status');
    return body;
  } catch {
    return {
      success: true,
      is_maintenance: false,
      status: 'online',
      app_name: 'Pengaduan SI-GESIT',
    };
  }
}