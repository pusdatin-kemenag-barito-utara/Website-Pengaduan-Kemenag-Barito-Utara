import { useEffect, useState, type FormEvent } from 'react';
import {
  Building2,
  Check,
  HardDrive,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { adminCleanupStorage, adminGetSettings, adminUpdateSettings } from '../../lib/apiAdmin';
import type { SystemSettings } from './types';

export default function SystemSettingsView() {
  const [settings, setSettings] = useState<SystemSettings>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCleaningStorage, setIsCleaningStorage] = useState<boolean>(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted_count: number; active_count: number; total_r2: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setSettings(await adminGetSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan sistem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSuccessMsg(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await adminUpdateSettings(settings);
      setSuccessMsg('Pengaturan kedinasan & sistem berhasil disimpan.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleanupStorage = async () => {
    if (!confirm('Apakah Anda ingin memindai Cloudflare R2 dan menghapus semua berkas lampiran lama yang tiketnya sudah tidak ada di database?')) {
      return;
    }
    setIsCleaningStorage(true);
    setCleanupResult(null);
    try {
      const res = await adminCleanupStorage();
      setCleanupResult(res);
      setSuccessMsg(`Pembersihan R2 selesai: ${res.deleted_count} file sampah berhasil dibersihkan.`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membersihkan storage R2.');
    } finally {
      setIsCleaningStorage(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-slate-700" />
            <span>Pengaturan Sistem &amp; Profil Instansi</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Konfigurasi informasi instansi, nomor helpdesk resmi, data pejabat penandatangan, dan pemeliharaan sistem.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Memuat data konfigurasi...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Section 1: Profil Instansi */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Identitas Kantor &amp; Layanan
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">Nama Resmi Instansi</label>
                  <input
                    type="text"
                    value={settings.office_name || ''}
                    onChange={(e) => handleChange('office_name', e.target.value)}
                    placeholder="Kantor Kementerian Agama Kabupaten Barito Utara"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">Alamat Kantor Lengkap</label>
                  <input
                    type="text"
                    value={settings.office_address || ''}
                    onChange={(e) => handleChange('office_address', e.target.value)}
                    placeholder="Jl. Ahmad Yani No. 126, Muara Teweh, Kalimantan Tengah"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Nomor Telepon Kantor</label>
                  <input
                    type="text"
                    value={settings.office_phone || ''}
                    onChange={(e) => handleChange('office_phone', e.target.value)}
                    placeholder="(0519) 21014"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nomor WhatsApp Helpdesk / PTSP
                  </label>
                  <input
                    type="text"
                    value={settings.helpdesk_whatsapp || ''}
                    onChange={(e) => handleChange('helpdesk_whatsapp', e.target.value)}
                    placeholder="6285117491212"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[11px] text-slate-400 font-medium">Gunakan kode negara (contoh: 628...)</p>
                </div>
              </div>
            </div>

            {/* Section 2: Pejabat Penandatangan */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Pejabat Penandatangan Laporan (Kop &amp; Tanda Tangan)
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Nama Lengkap Pejabat &amp; Gelar</label>
                  <input
                    type="text"
                    value={settings.office_leader_name || ''}
                    onChange={(e) => handleChange('office_leader_name', e.target.value)}
                    placeholder="H. Arbaja, S.Ag., M.A.P."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Jabatan Dinas</label>
                  <input
                    type="text"
                    value={settings.office_leader_title || ''}
                    onChange={(e) => handleChange('office_leader_title', e.target.value)}
                    placeholder="Kepala Kantor Kementerian Agama Kab. Barito Utara"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">NIP Pejabat</label>
                  <input
                    type="text"
                    value={settings.office_leader_nip || ''}
                    onChange={(e) => handleChange('office_leader_nip', e.target.value)}
                    placeholder="197205151998031003"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-lg shadow-emerald-700/25 cursor-pointer disabled:opacity-50 transition-all active:scale-98"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan Perubahan...' : 'Simpan Seluruh Pengaturan'}</span>
              </button>
            </div>
          </form>

          {/* Section 3: Pemeliharaan Storage Cloudflare R2 */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-slate-700" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Pemeliharaan Penyimpanan Lampiran (Cloudflare R2)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pindai bucket Cloudflare R2 untuk menghapus berkas lampiran yatim yang tiketnya telah dihapus.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Pembersihan Berkas Sampah R2</p>
                <p className="text-[11px] text-slate-500">
                  Operasi ini aman dan hanya menghapus file lampiran yang tidak lagi tercatat di basis data.
                </p>
                {cleanupResult && (
                  <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    Hasil pemindaian: {cleanupResult.deleted_count} file sampah dihapus &bull; {cleanupResult.active_count} file aktif dipertahankan &bull; Total di R2: {cleanupResult.total_r2} file.
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleCleanupStorage}
                disabled={isCleaningStorage}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 shrink-0 self-start sm:self-auto"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isCleaningStorage ? 'animate-spin text-emerald-400' : ''}`} />
                <span>{isCleaningStorage ? 'Memindai R2...' : 'Pindai & Bersihkan R2'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
