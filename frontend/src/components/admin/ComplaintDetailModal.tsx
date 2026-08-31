import { useEffect, useState } from 'react';
import {
  Check, CheckCircle, Copy, ExternalLink, FileText, MessageCircle, Sparkles, X,
} from 'lucide-react';
import type { AdminItem } from '../../lib/apiAdmin';
import { STATUS_OPTIONS, categoryBadge, statusBadge } from './types';

interface ComplaintDetailModalProps {
  selectedItem: AdminItem | null;
  onClose: () => void;
  onSaveUpdate: (ticketNumber: string, status: string, adminResponse: string) => Promise<void>;
  onWhatsAppNotif: (item: AdminItem) => void;
}

const RESPONSE_TEMPLATES = [
  {
    label: 'Sedang Diproses',
    status: 'Diproses',
    text: 'Pengaduan / aspirasi Anda telah kami terima dan saat ini sedang ditindaklanjuti oleh seksi / unit terkait di lingkungan Kementerian Agama Barito Utara. Terima kasih atas laporannya.',
  },
  {
    label: 'Telah Selesai',
    status: 'Selesai',
    text: 'Pengaduan / aspirasi Anda telah selesai ditindaklanjuti oleh petugas kami. Terima kasih atas partisipasi aktif Anda dalam meningkatkan kualitas pelayanan publik Kemenag Barito Utara.',
  },
  {
    label: 'Perlu Bukti Tambahan',
    status: 'Diproses',
    text: 'Laporan Anda sedang kami telaah. Mohon kirimkan data atau dokumen pendukung tambahan melalui nomor WhatsApp resmi pelayanan agar penanganan dapat dilakukan secara maksimal.',
  },
];

export default function ComplaintDetailModal({
  selectedItem,
  onClose,
  onSaveUpdate,
  onWhatsAppNotif,
}: ComplaintDetailModalProps) {
  const [newStatus, setNewStatus] = useState<string>(selectedItem?.status || 'Menunggu');
  const [adminResponseText, setAdminResponseText] = useState<string>(selectedItem?.admin_response || '');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isTicketCopied, setIsTicketCopied] = useState<boolean>(false);

  // Synchronize state whenever a new selectedItem is passed
  useEffect(() => {
    if (selectedItem) {
      setNewStatus(selectedItem.status);
      setAdminResponseText(selectedItem.admin_response || '');
      setSaveMsg(null);
      setIsTicketCopied(false);
    }
  }, [selectedItem]);

  if (!selectedItem) return null;

  const handleCopyTicket = () => {
    if (selectedItem && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(selectedItem.ticket_number);
      setIsTicketCopied(true);
      setTimeout(() => setIsTicketCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      await onSaveUpdate(selectedItem.ticket_number, newStatus, adminResponseText);
      setSaveMsg({ ok: true, text: 'Tanggapan berhasil disimpan.' });
      setTimeout(() => {
        onClose();
      }, 400);
    } catch (err) {
      setSaveMsg({ ok: false, text: err instanceof Error ? err.message : 'Gagal menyimpan data.' });
    } finally {
      setIsSaving(false);
    }
  };

  const applyTemplate = (tpl: typeof RESPONSE_TEMPLATES[0]) => {
    setNewStatus(tpl.status);
    setAdminResponseText(tpl.text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl shadow-slate-950/30 border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">Detail &amp; Respon Petugas</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400">Tiket: #{selectedItem.ticket_number}</p>
                <button
                  type="button"
                  onClick={handleCopyTicket}
                  className="p-1 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-white/10 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                  title="Salin Nomor Tiket"
                  aria-label="Salin Nomor Tiket"
                >
                  {isTicketCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 animate-in zoom-in-50" />
                      <span className="text-[10px] font-bold text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${statusBadge(selectedItem.status)}`}>
              {selectedItem.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-5 flex-1 min-h-0 overflow-hidden">
          {/* Left Column: Complainant Metadata */}
          <div className="lg:col-span-2 p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-slate-200/80 bg-slate-50/60 overflow-y-auto flex flex-col gap-4">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2.5">
                Informasi Pelapor
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kategori</p>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-black border ${categoryBadge(selectedItem.category)}`}>
                    {selectedItem.category}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tgl Pengajuan</p>
                  <p className="text-xs font-bold text-slate-900">
                    {selectedItem.created_at
                      ? new Date(selectedItem.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Nama Pemohon</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {selectedItem.is_anonymous ? <span className="text-slate-400 italic">Anonim</span> : selectedItem.full_name || '-'}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">No Handphone</p>
                  <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
                    {selectedItem.phone_number}
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3 col-span-2 shadow-xs">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Unit Layanan</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900">{selectedItem.service_unit}</p>
                </div>
              </div>
            </div>

            {/* Rating if present */}
            {selectedItem.rating ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 shadow-xs">
                <p className="text-[10px] text-amber-700 font-black uppercase tracking-wider mb-1">
                  Penilaian Kepuasan Masyarakat
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-amber-600 tracking-wider">
                    {'\u2605'.repeat(selectedItem.rating)}
                    {'\u2606'.repeat(5 - selectedItem.rating)}
                  </span>
                  <span className="text-xs font-black text-amber-800">({selectedItem.rating} dari 5 Bintang)</span>
                </div>
              </div>
            ) : null}

            {/* Attachment Link */}
            {selectedItem.file_url && (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-800 truncate">Lampiran Dokumen</span>
                </div>
                <a
                  href={
                    selectedItem.file_url.startsWith('http://') || selectedItem.file_url.startsWith('https://')
                      ? selectedItem.file_url
                      : `/api/v1/admin/pengaduan/${selectedItem.ticket_number}/file`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                >
                  <span>Lihat Berkas</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Action Bar inside Left Drawer */}
            <div className="flex flex-col gap-2 mt-auto pt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => onWhatsAppNotif(selectedItem)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="Kirim notifikasi WhatsApp ke pemohon"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim WA</span>
                </button>
              </div>

              <button
                type="button"
                disabled={isSaving}
                onClick={handleSave}
                className="w-full px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Pembaruan Respon'}</span>
              </button>

              {saveMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border text-center ${
                    saveMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {saveMsg.text}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Complaint Content & Official Response Editor */}
          <div className="lg:col-span-3 p-5 sm:p-7 overflow-y-auto flex flex-col gap-5">
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">
                Uraian Lengkap Pengaduan / Aspirasi
              </p>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-slate-800 whitespace-pre-wrap font-medium leading-relaxed text-xs sm:text-sm max-h-52 overflow-y-auto">
                {selectedItem.content}
              </div>
            </div>

            {selectedItem.admin_response && (
              <div>
                <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tanggapan Tersimpan Sebelumnya</span>
                </p>
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                  {selectedItem.admin_response}
                </div>
              </div>
            )}

            {/* Status Selector */}
            <div className="pt-2">
              <label className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">
                Status Penyelesaian Tiket
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 cursor-pointer transition-all"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Templates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Template Tanggapan Cepat</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {RESPONSE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-[11px] font-bold text-slate-600 transition-all cursor-pointer active:scale-95"
                  >
                    + {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Response Textarea */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                  Tanggapan Resmi Tim Pengaduan
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  {adminResponseText.length} karakter
                </span>
              </div>
              <textarea
                rows={5}
                value={adminResponseText}
                onChange={(e) => setAdminResponseText(e.target.value)}
                placeholder="Tuliskan jawaban respon atau penjelasan penanganan perihal pengaduan ini..."
                className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-medium transition-all resize-none leading-relaxed flex-1 min-h-[120px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
