import { useState } from 'react';
import {
  AlertCircle, Check, CheckCircle, ChevronLeft, ChevronRight, Clock,
  Copy, Eye, FileDown, FileSpreadsheet, FileText, MessageCircle, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import type { AdminItem, AdminStats } from '../../lib/apiAdmin';
import { adminCleanupStorage, adminListPengaduan } from '../../lib/apiAdmin';
import { analytics } from '../../lib/analytics';
import { CATEGORY_OPTIONS, ITEMS_PER_PAGE, STATUS_OPTIONS, categoryBadge, statusBadge } from './types';

interface ComplaintTableProps {
  list: AdminItem[];
  totalItems: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterCategory: string;
  setFilterCategory: (cat: string) => void;
  filterStatus: string;
  setFilterStatus: (stat: string) => void;
  isLoading: boolean;
  listError: string | null;
  stats: AdminStats | null;
  onFetchPengaduan: (page?: number, opts?: { search?: string; category?: string; status?: string }) => void;
  onOpenDetail: (item: AdminItem) => void;
  onOpenDelete: (item: AdminItem) => void;
  onWhatsAppNotif: (item: AdminItem) => void;
}

export default function ComplaintTable({
  list,
  totalItems,
  currentPage,
  setCurrentPage,
  searchTerm,
  setSearchTerm,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  isLoading,
  listError,
  stats,
  onFetchPengaduan,
  onOpenDetail,
  onOpenDelete,
  onWhatsAppNotif,
}: ComplaintTableProps) {
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isCleaningStorage, setIsCleaningStorage] = useState<boolean>(false);

  const handleCleanupStorage = async () => {
    if (!confirm('Apakah Anda ingin memindai Cloudflare R2 dan menghapus semua berkas lampiran lama yang tiketnya sudah tidak ada di database?')) {
      return;
    }
    setIsCleaningStorage(true);
    try {
      const res = await adminCleanupStorage();
      alert(`Pembersihan R2 Selesai!\n\n• File sampah dihapus: ${res.deleted_count}\n• File aktif di database: ${res.active_count}\n• Total berkas di R2 sebelumnya: ${res.total_r2}`);
      onFetchPengaduan(currentPage);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membersihkan storage R2.');
    } finally {
      setIsCleaningStorage(false);
    }
  };

  const handleCopyTicket = (ticket: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(ticket);
      setCopiedTicket(ticket);
      setTimeout(() => {
        setCopiedTicket((prev) => (prev === ticket ? null : prev));
      }, 2000);
    }
  };

  // Export Excel — Mengambil seluruh data dari Backend Go sesuai filter aktif
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      let exportItems: AdminItem[] = list;
      try {
        const res = await adminListPengaduan({
          page: 1,
          per_page: 1000,
          search: searchTerm,
          category: filterCategory,
          status: filterStatus,
        });
        if (res?.items && res.items.length > 0) {
          exportItems = res.items;
        }
      } catch (err) {
        console.warn('Fallback to local list for Excel export:', err);
      }

      const { exportToExcelXlsx } = await import('../../lib/exportUtils');
      const filterSummary = `Kategori: ${filterCategory === 'ALL' ? 'Semua' : filterCategory} | Status: ${filterStatus === 'ALL' ? 'Semua' : filterStatus}`;
      exportToExcelXlsx(exportItems, filterSummary);
      analytics.exportAdminData('xlsx', exportItems.length);
    } catch (err) {
      console.error('Export Excel error:', err);
      alert(`Gagal mengekspor data Excel: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export PDF — Dokumen Resmi A4 Landscape dengan KOP Kemenag Barito Utara
  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      let exportItems: AdminItem[] = list;
      try {
        const res = await adminListPengaduan({
          page: 1,
          per_page: 1000,
          search: searchTerm,
          category: filterCategory,
          status: filterStatus,
        });
        if (res?.items && res.items.length > 0) {
          exportItems = res.items;
        }
      } catch (err) {
        console.warn('Fallback to local list for PDF export:', err);
      }

      const { exportToPrintablePdf } = await import('../../lib/exportUtils');
      const filterSummary = `Kategori: ${filterCategory === 'ALL' ? 'Semua' : filterCategory} | Status: ${filterStatus === 'ALL' ? 'Semua' : filterStatus}`;
      exportToPrintablePdf(exportItems, filterSummary);
      analytics.exportAdminData('pdf', exportItems.length);
    } catch (err) {
      console.error('Export PDF error:', err);
      alert(`Gagal mengekspor data PDF: ${err instanceof Error ? err.message : 'Terjadi kesalahan'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const totalCount = stats?.total ?? totalItems;
  const countMenunggu = stats?.by_status?.['Menunggu'] ?? list.filter((i) => i.status === 'Menunggu').length;
  const countDiproses = stats?.by_status?.['Diproses'] ?? list.filter((i) => i.status === 'Diproses').length;
  const countSelesai = stats?.by_status?.['Selesai'] ?? list.filter((i) => i.status === 'Selesai').length;

  return (
    <div className="space-y-6">
      {/* Header & Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Kelola Pengaduan &amp; Aspirasi</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Pantau, perbarui status, verifikasi data, dan kirim tanggapan resmi ke pelapor.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => onFetchPengaduan(currentPage)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleCleanupStorage}
            disabled={isCleaningStorage}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm font-bold text-xs flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
            title="Bersihkan Berkas Sampah di Cloudflare R2"
          >
            <Trash2 className={`w-3.5 h-3.5 text-slate-500 ${isCleaningStorage ? 'animate-spin' : ''}`} />
            <span>{isCleaningStorage ? 'Membersihkan...' : 'Bersihkan R2'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-60"
            title="Download Rekap Spreadsheet Excel Lengkap"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isExportingExcel ? 'animate-spin' : ''}`} />
            <span>{isExportingExcel ? 'Mengekspor...' : 'Export Excel'}</span>
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95 disabled:opacity-60"
            title="Download Dokumen Laporan PDF Resmi"
          >
            <FileDown className={`w-3.5 h-3.5 ${isExportingPdf ? 'animate-spin' : ''}`} />
            <span>{isExportingPdf ? 'Mengekspor...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>

      {listError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 font-medium shadow-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{listError}</span>
        </div>
      )}

      {/* Synchronized Global Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Pengaduan',
            val: totalCount,
            color: 'text-emerald-700',
            icon: <FileText className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
          {
            label: 'Menunggu Respon',
            val: countMenunggu,
            color: 'text-amber-700',
            icon: <Clock className="w-5 h-5 text-amber-600" />,
            bg: 'bg-amber-500/10 border-amber-500/20',
          },
          {
            label: 'Sedang Diproses',
            val: countDiproses,
            color: 'text-blue-700',
            icon: <RefreshCw className="w-5 h-5 text-blue-600" />,
            bg: 'bg-blue-500/10 border-blue-500/20',
          },
          {
            label: 'Selesai Ditindaklanjuti',
            val: countSelesai,
            color: 'text-emerald-700',
            icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
            bg: 'bg-emerald-500/10 border-emerald-500/20',
          },
        ].map((card) => (
          <div
            key={card.label}
            className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-between transition-all hover:shadow-md hover:border-slate-300"
          >
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-[11px]">{card.label}</p>
              <p className={`text-3xl font-black ${card.color} mt-1 tracking-tight`}>{card.val}</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl border ${card.bg} flex items-center justify-center shrink-0`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3.5 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onFetchPengaduan(1, { search: searchTerm });
            }}
            placeholder="Cari tiket, nama, no HP..."
            className="w-full pl-10 pr-9 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                onFetchPengaduan(1, { search: '' });
              }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              onFetchPengaduan(1, { category: e.target.value });
            }}
            className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="ALL">Semua Kategori</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              onFetchPengaduan(1, { status: e.target.value });
            }}
            className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 sm:p-5">No Tiket</th>
                <th className="p-4 sm:p-5">Kategori</th>
                <th className="p-4 sm:p-5">Terkait Layanan</th>
                <th className="p-4 sm:p-5">Nama Pemohon</th>
                <th className="p-4 sm:p-5">No Handphone</th>
                <th className="p-4 sm:p-5">Status</th>
                <th className="p-4 sm:p-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 font-bold">
                    <div className="inline-flex items-center gap-3">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      <span>Memuat data pengaduan...</span>
                    </div>
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="w-10 h-10 text-slate-300 stroke-1" />
                      <p className="text-slate-600 font-extrabold text-sm">Tidak ada data pengaduan yang ditemukan</p>
                      <p className="text-xs text-slate-400 font-medium">Coba sesuaikan kata kunci pencarian atau filter status.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="flex flex-col">
                        <div className="inline-flex items-center gap-1.5 group">
                          <span className="font-black text-emerald-800 tracking-tight text-xs sm:text-sm">
                            {item.ticket_number}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyTicket(item.ticket_number)}
                            className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95"
                            title="Salin Nomor Tiket"
                            aria-label="Salin Nomor Tiket"
                          >
                            {copiedTicket === item.ticket_number ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50" />
                                <span className="text-[10px] font-bold text-emerald-600">Tersalin!</span>
                              </>
                            ) : (
                              <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                            )}
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium mt-0.5">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border ${categoryBadge(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 font-semibold text-slate-800 max-w-[220px]">
                      <p className="truncate" title={item.service_unit}>
                        {item.service_unit}
                      </p>
                    </td>
                    <td className="p-4 sm:p-5 font-bold text-slate-900">
                      {item.is_anonymous ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold">
                          Anonim
                        </span>
                      ) : (
                        item.full_name || '-'
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-slate-600 font-medium">
                      {item.phone_number}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold border inline-flex items-center gap-1.5 ${statusBadge(item.status)}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenDetail(item)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm hover:shadow active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail / Respon</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onWhatsAppNotif(item)}
                          className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="Kirim Notifikasi WhatsApp ke Pemohon"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDelete(item)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                          title="Hapus Pengaduan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600">
          <p>
            Menampilkan {totalItems > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0} -{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} dari {totalItems} total tiket
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => onFetchPengaduan(currentPage - 1)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-2 font-bold text-slate-700">
              Halaman {currentPage} dari {Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))}
            </span>
            <button
              type="button"
              disabled={currentPage >= Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE))}
              onClick={() => onFetchPengaduan(currentPage + 1)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
