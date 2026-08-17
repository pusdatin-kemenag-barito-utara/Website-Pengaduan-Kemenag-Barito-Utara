import { useState } from 'react';
import { Check, CheckCircle2, Clock, Copy, Download, X } from 'lucide-react';
import type { SubmittedDetails } from './types';

interface SuccessModalProps {
  details: SubmittedDetails | null;
  onClose: () => void;
  onDownloadTicket: () => void;
  isDownloading: boolean;
}

export default function SuccessModal({
  details,
  onClose,
  onDownloadTicket,
  isDownloading,
}: SuccessModalProps) {
  const [isCopiedTicket, setIsCopiedTicket] = useState<boolean>(false);

  if (!details) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden overscroll-contain touch-none">
      <div className="relative w-full max-w-xl bg-white rounded-3xl sm:rounded-4xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto max-h-[92vh] flex flex-col touch-auto">
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-7 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
              <CheckCircle2 className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-300" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] sm:text-xs font-black border border-emerald-400/30 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Pengaduan Berhasil Terkirim
              </span>
              <h3 className="text-lg sm:text-2xl font-black tracking-tight">Detail Pengajuan &amp; Tiket</h3>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-7 overflow-y-auto space-y-4 flex-1 text-slate-800">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between gap-3 border border-slate-800">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Nomor Tiket Resmi</span>
              <span className="font-mono text-base sm:text-2xl font-black text-emerald-400 tracking-wider break-all block">
                {details.ticket}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(details.ticket);
                setIsCopiedTicket(true);
                setTimeout(() => setIsCopiedTicket(false), 2500);
              }}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                isCopiedTicket
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/15'
              }`}
            >
              {isCopiedTicket ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-300" />
                  <span>Salin Tiket</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Status Laporan</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
                <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                {details.status}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Waktu Dikirim</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800 block leading-snug">{details.createdAt}</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Rincian Form Pengajuan</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">Kategori Pengaduan</span>
                <span className="font-extrabold text-slate-900 block">{details.category}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                <span className="text-[10px] font-extrabold text-emerald-700 block mb-0.5">Terkait Unit Layanan</span>
                <span className="font-extrabold text-emerald-950 block">{details.serviceUnit}</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">Nama Pengadu</span>
                <span className="font-extrabold text-slate-900 block">
                  {details.isAnonymous ? 'Anonim (Disembunyikan)' : details.fullName}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">No. WhatsApp / HP</span>
                <span className="font-mono font-extrabold text-slate-900 block">{details.phone}</span>
              </div>
              {details.eventDate && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">Tanggal Kejadian</span>
                  <span className="font-extrabold text-slate-900 block">{details.eventDate}</span>
                </div>
              )}
              {details.attachmentName && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">Lampiran Berkas</span>
                  <span className="font-extrabold text-emerald-700 truncate block">{details.attachmentName}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Isi Uraian &amp; Catatan Pengajuan:
              </span>
              <div className="text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto pr-2">
                {details.content}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onDownloadTicket}
            disabled={isDownloading}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-700/20 active:scale-95 disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>{isDownloading ? 'Mengunduh...' : 'Download Bukti Tiket'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
          >
            <span>Tutup &amp; Kirim Pengaduan Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
