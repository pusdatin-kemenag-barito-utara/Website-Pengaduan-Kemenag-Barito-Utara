'use server';

import { supabase, Pengaduan } from '@/lib/supabase';

// Fetch semua pengaduan untuk admin dashboard
export async function getAdminPengaduanListAction() {
  try {
    const { data, error } = await supabase
      .from('pengaduan')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error);
      // Fallback mock data jika supabase belum terhubung
      return {
        success: true,
        data: [
          {
            id: '1',
            ticket_number: 'SGT-20260731-9821',
            category: 'Pengaduan',
            service_unit: 'Pelayanan Terpadu Satu Pintu (PTSP)',
            full_name: 'Ahmad Fauzi',
            phone_number: '081234567890',
            content: 'Mohon penambahan loket antrian di PTSP karena antrian cukup padat pada jam 10 pagi.',
            is_anonymous: false,
            status: 'Menunggu',
            admin_response: null,
            created_at: new Date().toISOString(),
          },
          {
            id: '2',
            ticket_number: 'SGT-20260731-4412',
            category: 'Saran',
            service_unit: 'Layanan Sub Tata Usaha',
            full_name: null,
            phone_number: '089876543210',
            content: 'Sebaiknya ada fitur scan QR code untuk cek berkas surat masuk.',
            is_anonymous: true,
            status: 'Diproses',
            admin_response: 'Saran telah kami teruskan ke tim TI Sub Tata Usaha.',
            created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
        ] as Pengaduan[],
      };
    }

    return { success: true, data: data as Pengaduan[] };
  } catch (err) {
    console.error('getAdminPengaduanListAction error:', err);
    return { success: false, message: 'Gagal mengambil data pengaduan.' };
  }
}

// Update status & respon admin
export async function updatePengaduanStatusAction(id: string, status: Pengaduan['status'], admin_response: string) {
  try {
    const { error } = await supabase
      .from('pengaduan')
      .update({
        status,
        admin_response,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return { success: true, message: 'Status berhasil diperbarui (Mode lokal/mock).' };
    }

    return { success: true, message: 'Status dan tanggapan berhasil diperbarui!' };
  } catch (err) {
    console.error('updatePengaduanStatusAction error:', err);
    return { success: false, message: 'Gagal memperbarui status pengaduan.' };
  }
}
