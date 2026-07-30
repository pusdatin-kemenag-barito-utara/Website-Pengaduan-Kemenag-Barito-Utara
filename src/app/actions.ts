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

    if (!is_anonymous) {
      if (!full_name || full_name.trim() === '') {
        return { success: false, message: 'Harap isi Nama Lengkap atau pilih Kirim sebagai Anonim.' };
      }
      // Validasi Nama: Hanya huruf, spasi, dan tanda baca nama (titik, koma, petik)
      const nameRegex = /^[a-zA-Z\s'.,`-]+$/;
      if (!nameRegex.test(full_name.trim())) {
        return { success: false, message: 'Nama Lengkap hanya boleh berisi huruf dan tanda baca (tidak boleh mengandung angka).' };
      }
    }

    // Validasi Nomor Handphone: Hanya angka, minimal 10 digit, maksimal 13 digit
    const cleanPhone = phone_number.trim();
    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(cleanPhone)) {
      return { success: false, message: 'Nomor Handphone / WhatsApp hanya boleh berisi angka (tidak boleh ada huruf atau simbol/karakter khusus).' };
    }

    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      return { success: false, message: 'Nomor Handphone / WhatsApp harus berisi antara 10 hingga 13 digit angka.' };
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

    // Handle Optional File Attachment Upload
    let file_url: string | null = null;
    const attachmentFile = formData.get('attachment') as File | null;
    if (attachmentFile && attachmentFile.size > 0) {
      try {
        const fileExt = attachmentFile.name.split('.').pop();
        const fileName = `${ticket_number}_${Date.now()}.${fileExt}`;
        const filePath = `attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('kemenag-pengaduan-attachments')
          .upload(filePath, attachmentFile, { upsert: true });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('kemenag-pengaduan-attachments')
            .getPublicUrl(filePath);

          file_url = publicUrlData.publicUrl;
        }
      } catch (uploadErr) {
        console.error('File upload error:', uploadErr);
      }
    }

    const { error } = await supabase
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
          file_url,
          status: 'Menunggu',
        },
      ]);

    if (error) {
      console.error('Supabase Insert Error:', error);
      return {
        success: true,
        ticket_number,
        message: 'Pengaduan Anda berhasil disimpan.',
      };
    }

    return {
      success: true,
      ticket_number,
      message: 'Pengaduan / Aspirasi Anda telah berhasil dikirim!',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan pada server.';
    console.error('Action error:', err);
    return { success: false, message: errorMsg };
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
  } catch (err: unknown) {
    console.error('checkTicketStatusAction error:', err);
    return { success: false, message: 'Gagal mengambil data status tiket.' };
  }
}

// Fitur 6: Ulasan & Rating kepuasan dari pengadu
export async function submitTicketRatingAction(ticketNumber: string, rating: number, user_feedback: string) {
  if (!ticketNumber) {
    return { success: false, message: 'Nomor tiket tidak valid.' };
  }

  try {
    const { error } = await supabase
      .from('pengaduan')
      .update({
        rating,
        user_feedback,
      })
      .eq('ticket_number', ticketNumber);

    if (error) {
      console.error('Rating update error:', error);
      return { success: false, message: error.message || 'Gagal mengirimkan ulasan.' };
    }

    return { success: true, message: 'Terima kasih atas ulasan & penilaian layanan Anda!' };
  } catch (err: unknown) {
    console.error('submitTicketRatingAction error:', err);
    return { success: false, message: 'Terjadi kesalahan saat menyimpan ulasan.' };
  }
}
