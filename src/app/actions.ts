'use server';

import { supabase, supabaseAdmin, Pengaduan } from '@/lib/supabase';
import { uploadToR2, getR2SignedUrl, isR2Path } from '@/lib/r2';

// Generate Random Ticket ID (misal: SGT-20260731-9821)
function generateTicketNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `SGT-${dateStr}-${randomNum}`;
}

// Anti-Brute-Force Rate Limiter Store (Maksimal 3 pengiriman per 5 menit per nomor HP/IP)
const submissionTracker = new Map<string, number[]>();

function checkRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 menit window
  const maxSubmissions = 3; // Maksimal 3 laporan per 5 menit

  const timestamps = (submissionTracker.get(identifier) || []).filter(ts => now - ts < windowMs);

  if (timestamps.length >= maxSubmissions) {
    const oldest = timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, waitSeconds };
  }

  timestamps.push(now);
  submissionTracker.set(identifier, timestamps);
  return { allowed: true };
}

// Anti-Enumeration Rate Limiter untuk fitur Lacak Tiket (Maks 10 pencarian per menit)
const searchTracker = new Map<string, number[]>();

function checkSearchRateLimit(identifier: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 menit window
  const maxSearches = 10; // Maksimal 10 pencarian per menit

  const timestamps = (searchTracker.get(identifier) || []).filter(ts => now - ts < windowMs);

  if (timestamps.length >= maxSearches) {
    const oldest = timestamps[0];
    const waitSeconds = Math.ceil((windowMs - (now - oldest)) / 1000);
    return { allowed: false, waitSeconds };
  }

  timestamps.push(now);
  searchTracker.set(identifier, timestamps);
  return { allowed: true };
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

    // Protection 1: Anti-Spam / Anti-Brute-Force Rate Limiting (Maksimal 3 pengajuan per 5 menit)
    const rateCheck = checkRateLimit(cleanPhone);
    if (!rateCheck.allowed) {
      return {
        success: false,
        message: `Deteksi pengiriman berulang! Demi keamanan sistem dari Spam/Bot, harap tunggu ${rateCheck.waitSeconds} detik lagi sebelum mengirim pengaduan baru.`,
      };
    }

    // Protection 2: Turnstile Token Enforcement
    if (!turnstileToken) {
      return { success: false, message: 'Verifikasi keamanan Cloudflare Turnstile (Anti-Bot) diperlukan!' };
    }

    // Turnstile Token Validation dengan Cloudflare Siteverify API
    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA';
    if (turnstileSecret && turnstileToken) {
      try {
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `secret=${encodeURIComponent(turnstileSecret)}&response=${encodeURIComponent(turnstileToken)}`,
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success && process.env.TURNSTILE_SECRET_KEY) {
          return { success: false, message: 'Verifikasi keamanan Turnstile gagal. Silakan muat ulang halaman dan coba lagi.' };
        }
      } catch (captchaErr) {
        console.warn('Turnstile verification bypass in dev:', captchaErr);
      }
    }

    const ticket_number = generateTicketNumber();

    // Handle Optional File Attachment Upload to Cloudflare R2 Storage (Bucket: data-pengaduan)
    let file_url: string | null = null;
    const attachmentFile = formData.get('attachment') as File | null;
    if (attachmentFile && attachmentFile.size > 0) {
      // Validasi Ukuran Berkas Maksimal 5MB (5 * 1024 * 1024 bytes)
      if (attachmentFile.size > 5 * 1024 * 1024) {
        return {
          success: false,
          message: `Ukuran file lampiran (${(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 5 MB. Harap pilih berkas yang lebih kecil.`
        };
      }

      try {
        const fileExt = attachmentFile.name.split('.').pop() || 'bin';
        const fileName = `${ticket_number}_${Date.now()}.${fileExt}`;
        const filePath = `pengaduan/${fileName}`;

        // Direct upload to Cloudflare R2 Storage (Bucket: data-pengaduan)
        file_url = await uploadToR2(attachmentFile, filePath);
      } catch (uploadErr) {
        console.error('Cloudflare R2 upload error:', uploadErr);
        // Fallback to Supabase Storage if R2 fails
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
        } catch (fbErr) {
          console.error('Fallback upload error:', fbErr);
        }
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
          status: 'Menunggu',
          file_url,
          created_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('Insert error:', error);
      return { success: false, message: error.message || 'Gagal menyimpan pengaduan ke database.' };
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

export async function checkTicketStatusAction(ticketNumber: string, clientHint?: string) {
  if (!ticketNumber || ticketNumber.trim() === '') {
    return { success: false, message: 'Nomor Tiket tidak boleh kosong!' };
  }

  // Validasi Format Nomor Tiket: hanya terima format SGT-YYYYMMDD-XXXX
  const ticketFormatRegex = /^SGT-\d{8}-\d{1,6}$/i;
  const cleanTicket = ticketNumber.trim().toUpperCase();
  if (!ticketFormatRegex.test(cleanTicket)) {
    return {
      success: false,
      message: 'Format nomor tiket tidak valid. Gunakan format: SGT-YYYYMMDD-XXXX (contoh: SGT-20260802-1001)',
    };
  }

  // Rate Limiting Anti-Enumeration (10 pencarian per menit per identifier)
  const identifier = clientHint || 'anonymous';
  const rateCheck = checkSearchRateLimit(identifier);
  if (!rateCheck.allowed) {
    return {
      success: false,
      message: `Terlalu banyak permintaan pencarian. Sistem mendeteksi aktivitas tidak wajar. Harap tunggu ${rateCheck.waitSeconds} detik sebelum mencoba kembali.`,
    };
  }

  try {
    const { data, error } = await supabase
      .from('pengaduan')
      .select('*')
      .eq('ticket_number', cleanTicket)
      .single();

    if (error || !data) {
      return { success: false, message: `Tiket dengan nomor ${cleanTicket} tidak ditemukan di sistem SI-GESIT.` };
    }

    // Resolve Cloudflare R2 Presigned Download URL if stored in R2
    let fileUrlResolved = data.file_url;
    if (isR2Path(data.file_url)) {
      try {
        fileUrlResolved = await getR2SignedUrl(data.file_url!);
      } catch (r2Err) {
        console.error('Failed to generate R2 signed url:', r2Err);
      }
    }

    return { success: true, data: { ...data, file_url: fileUrlResolved } };
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

  if (rating < 1 || rating > 5) {
    return { success: false, message: 'Nilai rating tidak valid (harus antara 1-5).' };
  }

  try {
    // Gunakan supabaseAdmin (service role) agar tidak diblokir RLS Supabase
    const { error, data } = await supabaseAdmin
      .from('pengaduan')
      .update({
        rating,
        user_feedback: user_feedback.trim() || null,
      })
      .eq('ticket_number', ticketNumber.trim().toUpperCase())
      .select('id');

    if (error) {
      console.error('Rating update error:', error);
      return { success: false, message: error.message || 'Gagal mengirimkan ulasan.' };
    }

    if (!data || data.length === 0) {
      return { success: false, message: 'Tiket tidak ditemukan atau ulasan gagal disimpan.' };
    }

    return { success: true, message: 'Terima kasih atas ulasan & penilaian layanan Anda!' };
  } catch (err: unknown) {
    console.error('submitTicketRatingAction error:', err);
    return { success: false, message: 'Terjadi kesalahan saat menyimpan ulasan.' };
  }
}
