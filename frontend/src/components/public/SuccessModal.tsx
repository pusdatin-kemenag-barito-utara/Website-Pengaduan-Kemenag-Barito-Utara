import { useState } from 'react';
import {
  Check, CheckCircle2, Clock, Copy, Download, FileText, Paperclip,
  ShieldCheck, X,
} from 'lucide-react';
import type { SubmittedDetails } from './types';

interface SuccessModalProps {
  details: SubmittedDetails | null;
  onClose: () => void;
  onDownloadTicket: () => void;
  isDownloading: boolean;
}

// Parser untuk uraian pengaduan terstruktur ([TAG]: value)
function parseStructuredContent(raw: string) {
  if (!raw) return [];
  const regex = /\[([A-Z0-9\s/_-]+)\]:\s*/gi;
  const matches = [...raw.matchAll(regex)];
  if (matches.length === 0) {
    return [{ label: null, value: raw.trim() }];
  }

  const sections: { label: string | null; value: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const label = match[1].trim();
    const startIndex = match.index! + match[0].length;
    const endIndex = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const value = raw.slice(startIndex, endIndex).trim();
    if (value) {
      // Normalisasi label menjadi format Title Case yang elegan
      const formattedLabel = label
        .toLowerCase()
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      sections.push({ label: formattedLabel, value });
    }
  }
  return sections;
}

export default function SuccessModal({
  details,
  onClose,
  onDownloadTicket,
  isDownloading,
}: SuccessModalProps) {
  const [isCopiedTicket, setIsCopiedTicket] = useState<boolean>(false);

  if (!details) return null;

  const contentSections = parseStructuredContent(details.content);

  const handleCopyTicket = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(details.ticket);
      setIsCopiedTicket(true);
      setTimeout(() => setIsCopiedTicket(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto print:hidden overscroll-contain touch-none font-['Plus_Jakarta_Sans',sans-serif]"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-white rounded-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto max-h-[92vh] flex flex-col touch-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER: EMERALD FOREST GRADIENT & OFFICIAL SEAL                     */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 p-5 sm:p-7 text-white relative shrink-0 overflow-hidden">
          {/* Subtle Ambient Light */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10"
            title="Tutup Jendela"
            aria-label="Tutup Jendela"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <CheckCircle2 className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/15 border border-emerald-300/25 text-emerald-200 text-[11px] font-bold tracking-wide mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Pengaduan Berhasil Dikirim</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight leading-snug">
                Tanda Terima &amp; Detail Tiket
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium mt-0.5">
                Kementerian Agama Kabupaten Barito Utara
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY: STRUCTURED DEFINITION & TICKET CERTIFICATE                    */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 text-slate-800 overscroll-contain">
          
          {/* Card Tiket Resmi */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  Nomor Tiket Resmi
                </span>
              </div>
              <span className="text-lg sm:text-2xl font-black text-emerald-400 tracking-wide break-all select-all">
                {details.ticket}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyTicket}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 ${
                isCopiedTicket
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
              }`}
            >
              {isCopiedTicket ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Salin Tiket</span>
                </>
              )}
            </button>
          </div>

          {/* Status & Waktu Pengajuan */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Status Pengajuan
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-800 text-xs font-extrabold border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {details.status}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Waktu Dikirim
              </span>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{details.createdAt}</span>
              </div>
            </div>
          </div>

          {/* Rincian Formulir */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-extrabold text-slate-900 tracking-tight">
                Rincian Informasi Pengajuan
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">Formulir Terverifikasi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Kategori Pengaduan
                </span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                  {details.category}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200/70">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-0.5">
                  Terkait Unit Layanan
                </span>
                <span className="font-extrabold text-emerald-950 text-xs sm:text-sm block">
                  {details.serviceUnit}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Nama Pemohon / Pengadu
                </span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                  {details.isAnonymous ? 'Anonim (Identitas Disembunyikan)' : details.fullName}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                  Nomor Handphone / WhatsApp
                </span>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm block tracking-wide">
                  {details.phone}
                </span>
              </div>

              {details.eventDate && (
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Tanggal Kejadian
                  </span>
                  <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                    {details.eventDate}
                  </span>
                </div>
              )}

              {details.attachmentName && (
                <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 sm:col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Paperclip className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Lampiran Dokumen Bukti
                    </span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block">
                      {details.attachmentName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold shrink-0">
                    Terlampir
                  </span>
                </div>
              )}
            </div>

            {/* Isi Uraian & Rincian Pengajuan */}
            <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Isi Uraian &amp; Keterangan Pengaduan
                </span>
              </div>

              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {contentSections.map((sec, idx) => (
                  <div key={idx} className="space-y-1">
                    {sec.label && (
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide block">
                        {sec.label}:
                      </span>
                    )}
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-xl border border-slate-200/60 shadow-2xs">
                      {sec.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER: ACTIONS & DOWNLOAD                                         */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onDownloadTicket}
            disabled={isDownloading}
            className="w-full sm:w-auto px-4 sm:px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Unduh Lembar Bukti Pengajuan (PNG Resmi)"
          >
            <Download className={`w-4 h-4 text-emerald-700 ${isDownloading ? 'animate-bounce' : ''}`} />
            <span>{isDownloading ? 'Membuat Bukti...' : 'Download Bukti Tiket'}</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-700/20 cursor-pointer active:scale-95"
          >
            <span>Tutup &amp; Kirim Pengaduan Baru</span>
          </button>
        </div>
      </div>
    </div>
  );
}
