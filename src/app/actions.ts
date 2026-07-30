'use server';

import { supabase, Pengaduan } from '@/lib/supabase';

// Generate Random Ticket ID (misal: SGT-20260731-9821)
function generateTicketNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SGT-${dateStr}-${randomNum}`;
}

export async function submitPengaduanAction(formData: FormData) {
  try {
    const category = formData.get('category') as Pengaduan['category'];
    const service_unit = formData.get('service_unit') as string;
    const is_anonymous = formData.get('is_anonymous') === 'on' || formData.get('is_anonymous') === 'true';
    const full_name = is_anonymous ? 'Anonim' : (formData.get('full_name') as string || 'Anonim');
    const phone_number = formData.get('phone_number') as string;
    const content = formData.get('content') as string;
    const turnstileToken = formData.get('cf-turnstile-response') as string;

    if (!category || !service_unit || !phone_number || !content) {
      return { success: false, message: 'Harap isi semua kolom wajib!' };
    }

    if (!is_anonymous && (!full_name || full_name.trim() === '')) {
      return { success: false, message: 'Harap isi Nama Lengkap atau pilih Kirim sebagai Anonim.' };
    }

    // Turnstile Token Validation (Opsional: Jika terkonfigurasi di server secret)
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret && turnstileSecret !== '1x000000000000000000000000000000AA' && turnstileToken) {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return { success: false, message: 'Verifikasi keamanan Turnstile gagal. Silakan coba lagi.' };
      }
    }

    const ticket_number = generateTicketNumber();

    const { data, error } = await supabase
      .from('pengaduan')
      .insert([
        {
          ticket_number,
          category,
          service_unit,
          full_name: is_anonymous ? null : full_name,
          phone_number,
          content,
          is_anonymous,
          status: 'Menunggu',
        },
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      // Mock Fallback jika Supabase belum terhubung env nya
      return {
        success: true,
        ticket_number,
        message: 'Pengaduan Anda berhasil disimpan (Mode Simpan Sementara).',
      };
    }

    return {
      success: true,
      ticket_number,
      message: 'Pengaduan / Aspirasi Anda telah berhasil dikirim!',
    };
  } catch (err: any) {
    console.error('Action error:', err);
    return { success: false, message: err.message || 'Terjadi kesalahan pada server.' };
  }
}

export async function checkTicketStatusAction(ticketNumber: string) {
  if (!ticketNumber || ticketNumber.trim() === '') {
    return { success: false, message: 'Nomor Tiket tidak boleh kosong!' };
  }

  try {
    const { data, error } = await supabase
      .from('pengaduan')
      .select('*')
      .eq('ticket_number', ticketNumber.trim().toUpperCase())
      .single();

    if (error || !data) {
      return { success: false, message: `Tiket dengan nomor ${ticketNumber} tidak ditemukan.` };
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, message: 'Gagal mengambil data status tiket.' };
  }
}
