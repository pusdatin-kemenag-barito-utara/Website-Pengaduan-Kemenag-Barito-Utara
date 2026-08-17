import { useState, type RefObject } from 'react';
import {
  AlertCircle, CheckCircle2, Clock, Download, Paperclip, Search, Sparkles, Star, X,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { checkTicketStatus, submitRating } from '../../lib/api';
import type { TrackResult } from '../../lib/api';
import { analytics } from '../../lib/analytics';

interface SearchTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchTicket: string;
  setSearchTicket: (val: string) => void;
  ticketResult: TrackResult | null;
  setTicketResult: (res: TrackResult | null) => void;
  ratingVal: number;
  setRatingVal: (val: number) => void;
  userFeedback: string;
  setUserFeedback: (val: string) => void;
  onDownloadTicket: (ticket: TrackResult) => void;
  isDownloading: boolean;
  qrSearchRef: RefObject<HTMLDivElement | null>;
}

export default function SearchTicketModal({
  isOpen,
  onClose,
  searchTicket,
  setSearchTicket,
  ticketResult,
  setTicketResult,
  ratingVal,
  setRatingVal,
  userFeedback,
  setUserFeedback,
  onDownloadTicket,
  isDownloading,
  qrSearchRef,
}: SearchTicketModalProps) {
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchCooldown, setSearchCooldown] = useState<number>(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!searchTicket.trim()) return;
    const ticketFormatRegex = /^SGT-\d{8}-\d{1,6}$/i;
    if (!ticketFormatRegex.test(searchTicket.trim())) {
      setSearchError('Format nomor tiket tidak valid. Gunakan format: SGT-YYYYMMDD-XXXX');
      return;
    }
    if (searchCooldown > 0) return;

    setIsSearching(true);
    setSearchError(null);
    setTicketResult(null);
    setRatingMsg(null);

    try {
      const cleanTicket = searchTicket.trim().toUpperCase();
      const data = await checkTicketStatus(cleanTicket);
      setTicketResult(data);
      analytics.searchTicket(cleanTicket);
      if (data.rating) setRatingVal(data.rating);
      if (data.user_feedback) setUserFeedback(data.user_feedback);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mencari tiket.');
    } finally {
      setIsSearching(false);
    }

    setSearchCooldown(3);
    const timer = setInterval(() => {
      setSearchCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRatingSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!ticketResult?.ticket_number) return;
    setIsSubmittingRating(true);
    setRatingMsg(null);
    try {
      const message = await submitRating(ticketResult.ticket_number, ratingVal, userFeedback);
      setRatingMsg(message);
      analytics.rateService(ticketResult.ticket_number, ratingVal);
    } catch (err) {
      setRatingMsg(err instanceof Error ? err.message : 'Gagal menyimpan penilaian.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const statusStr = (ticketResult?.status || '').toLowerCase();
  const isSelesai = statusStr.includes('selesai');
  const isDitolak = statusStr.includes('tolak');
  const isDiproses = statusStr.includes('proses') || isSelesai;
  const statusColor = isSelesai
    ? { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' }
    : isDiproses
      ? { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', dot: 'bg-cyan-500' }
      : isDitolak
        ? { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' }
        : { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-400' };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:hidden">
      <div className="w-full max-w-[90vw] lg:max-w-5xl xl:max-w-6xl bg-white rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-200/80 overflow-hidden relative flex flex-col max-h-[94vh]">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white/15 text-emerald-100 flex items-center justify-center shrink-0 border border-white/20">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">Lacak Status Tiket SI-GESIT</h3>
              <p className="text-xs text-emerald-200/80 font-medium">
                Pantau progres penanganan aspirasi &amp; pengaduan Anda secara real-time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setSearchError(null);
              setRatingMsg(null);
            }}
            className="p-2 text-emerald-200 hover:text-white rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="px-6 sm:px-8 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl mx-auto">
            <div className="relative flex-1">
              <label htmlFor="searchTicketInput" className="sr-only">
                Nomor Tiket Pengaduan
              </label>
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="searchTicketInput"
                type="text"
                aria-label="Nomor Tiket Pengaduan"
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                placeholder="SGT-YYYYMMDD-XXXX"
                className="w-full pl-10 pr-20 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 uppercase tracking-widest font-mono font-bold transition-all shadow-sm"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchTicket ? (
                  <button
                    type="button"
                    aria-label="Hapus nomor tiket"
                    onClick={() => setSearchTicket('')}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    title="Hapus"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Tempel nomor tiket dari clipboard"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) setSearchTicket(text.trim());
                      } catch {
                        /* ignore clipboard permissions */
                      }
                    }}
                    className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                    title="Tempel dari Clipboard"
                  >
                    Tempel
                  </button>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={isSearching || searchCooldown > 0}
              className={`px-6 py-3 rounded-xl text-white text-sm font-extrabold transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 group ${
                searchCooldown > 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-800 cursor-pointer disabled:opacity-50'
              }`}
            >
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mencari...</span>
                </>
              ) : searchCooldown > 0 ? (
                <>
                  <Clock className="w-4 h-4 opacity-80" />
                  <span>Tunggu {searchCooldown}s</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>Cari Tiket</span>
                </>
              )}
            </button>
          </form>

          {searchError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 font-semibold max-w-2xl mx-auto">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1">
          {ticketResult ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 min-h-0">
              <div className="lg:col-span-2 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/40 flex flex-col gap-6">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">Nomor Tiket</p>
                  <p className="font-mono text-xl sm:text-2xl font-black text-emerald-900 tracking-wide leading-tight break-all">
                    {ticketResult.ticket_number}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                    Dibuat:{' '}
                    {ticketResult.created_at
                      ? new Date(ticketResult.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })
                      : '-'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2">Status Penanganan</p>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                    <span className={`w-2 h-2 rounded-full ${statusColor.dot} ${isDiproses && !isSelesai ? 'animate-pulse' : ''}`} />
                    {ticketResult.status}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3">Alur Progres</p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800">Laporan Terdaftar</p>
                        <p className="text-[10px] text-slate-400">Tersimpan di database SI-GESIT</p>
                      </div>
                    </div>
                    <div className={`ml-3.5 w-0.5 h-4 ${isDiproses ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isDiproses ? 'bg-cyan-50 border-cyan-400' : 'bg-slate-100 border-slate-300'}`}>
                        <Clock className={`w-3.5 h-3.5 ${isDiproses && !isSelesai ? 'text-cyan-600 animate-spin' : isSelesai ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isDiproses ? 'text-cyan-800' : 'text-slate-400'}`}>Penelaahan &amp; Verifikasi</p>
                        <p className="text-[10px] text-slate-400">{isDiproses ? 'Sedang ditangani petugas' : 'Menunggu antrian'}</p>
                      </div>
                    </div>
                    <div className={`ml-3.5 w-0.5 h-4 ${isSelesai || isDitolak ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelesai ? 'bg-emerald-50 border-emerald-400' : isDitolak ? 'bg-rose-50 border-rose-400' : 'bg-slate-100 border-slate-300'}`}>
                        <Sparkles className={`w-3.5 h-3.5 ${isSelesai ? 'text-emerald-600' : isDitolak ? 'text-rose-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${isSelesai ? 'text-emerald-800' : isDitolak ? 'text-rose-700' : 'text-slate-400'}`}>
                          {isDitolak ? 'Laporan Ditolak' : 'Tanggapan Diberikan'}
                        </p>
                        <p className="text-[10px] text-slate-400">{isSelesai ? 'Selesai direspon' : isDitolak ? 'Laporan tidak dapat diproses' : 'Belum ada tanggapan'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Kategori</p>
                    <p className="text-slate-900 font-extrabold">{ticketResult.category}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pengirim</p>
                    <p className="text-slate-900 font-extrabold">{ticketResult.is_anonymous ? 'Anonim' : ticketResult.full_name}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-3 col-span-2">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Unit Layanan Terkait</p>
                    <p className="text-slate-900 font-extrabold">{ticketResult.service_unit}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-auto">
                  <button
                    type="button"
                    onClick={() => onDownloadTicket(ticketResult)}
                    disabled={isDownloading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    <Download className="w-4 h-4 text-emerald-200" />
                    {isDownloading ? 'Mengunduh...' : 'Download Bukti Tiket (PNG)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (searchCooldown > 0) return;
                      void handleSearch({ preventDefault: () => {} } as React.SyntheticEvent);
                    }}
                    disabled={isSearching}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-slate-200"
                  >
                    <Clock className={`w-3.5 h-3.5 ${isSearching ? 'animate-spin' : ''}`} />
                    {isSearching ? 'Memperbarui...' : 'Segarkan Status dari Database'}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto">
                <div>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2">Uraian Isi Pengaduan</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium max-h-52 overflow-y-auto">
                    {ticketResult.content}
                  </div>
                </div>

                {ticketResult.file_url && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-sm font-bold text-slate-800">Lampiran Berkas Pendukung</span>
                    </div>
                    <a
                      href={ticketResult.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Berkas
                    </a>
                  </div>
                )}

                {ticketResult.admin_response ? (
                  <div>
                    <p className="text-[11px] text-emerald-700 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tanggapan Resmi TIM Pengaduan Kemenag Barito Utara
                    </p>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-950 leading-relaxed whitespace-pre-wrap font-semibold">
                      {ticketResult.admin_response}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="font-medium">
                      Laporan Anda sedang dalam antrian penanganan TIM Pengaduan Kemenag Barito Utara. Pantau terus perkembangan melalui halaman ini.
                    </span>
                  </div>
                )}

                {(ticketResult.status === 'Selesai' || ticketResult.admin_response) && (
                  <form onSubmit={handleRatingSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        Nilai Kualitas Layanan
                      </span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingVal(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star className={`w-5 h-5 ${star <= ratingVal ? 'text-amber-500 fill-amber-500' : 'text-slate-300'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      placeholder="Bagikan pengalaman Anda terkait kecepatan & kualitas respon petugas..."
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-medium transition-all resize-none"
                    />

                    {ratingMsg && (
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">{ratingMsg}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingRating}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingRating ? 'Menyimpan...' : 'Kirim Ulasan Layanan'}
                    </button>
                  </form>
                )}

                {/* QR code untuk bukti tiket yang dicari (digunakan saat download PNG) */}
                <div ref={qrSearchRef} className="absolute -left-[9999px] -top-[9999px] pointer-events-none opacity-0" aria-hidden="true">
                  <QRCodeCanvas value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ticket=${encodeURIComponent(ticketResult.ticket_number)}`} size={120} level="H" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <Search className="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <p className="font-black text-slate-700 text-base">Masukkan nomor tiket Anda</p>
                <p className="text-slate-400 text-sm font-medium mt-1 max-w-sm">
                  Masukkan kode tiket SI-GESIT (contoh:{' '}
                  <span className="font-mono font-bold text-emerald-700">SGT-20260802-1001</span>) untuk melihat status penanganan laporan Anda.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
