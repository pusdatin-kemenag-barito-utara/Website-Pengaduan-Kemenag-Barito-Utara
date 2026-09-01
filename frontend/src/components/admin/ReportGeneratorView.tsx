import { useEffect, useState } from 'react';
import {
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
} from 'lucide-react';
import { adminGetReportSummary } from '../../lib/apiAdmin';
import type { ReportSummaryData } from './types';

export default function ReportGeneratorView() {
  const [summary, setSummary] = useState<ReportSummaryData | null>(null);
  const [periodPreset, setPeriodPreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Set default dates on preset change
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (periodPreset === 'this_month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
    } else if (periodPreset === 'q1') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-03-31`);
    } else if (periodPreset === 'q2') {
      setStartDate(`${y}-04-01`);
      setEndDate(`${y}-06-30`);
    } else if (periodPreset === 'q3') {
      setStartDate(`${y}-07-01`);
      setEndDate(`${y}-09-30`);
    } else if (periodPreset === 'q4') {
      setStartDate(`${y}-10-01`);
      setEndDate(`${y}-12-31`);
    } else if (periodPreset === 'semester_1') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-06-30`);
    } else if (periodPreset === 'semester_2') {
      setStartDate(`${y}-07-01`);
      setEndDate(`${y}-12-31`);
    } else if (periodPreset === 'this_year') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  }, [periodPreset]);

  const fetchSummary = async (start = startDate, end = endDate) => {
    setIsLoading(true);
    setError(null);
    try {
      setSummary(await adminGetReportSummary(start, end));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat rekapitulasi laporan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      void fetchSummary(startDate, endDate);
    }
  }, [startDate, endDate]);

  const handlePrintOfficialPDF = () => {
    if (!summary) return;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Popup diblokir browser. Izinkan popup untuk mencetak laporan.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const startStr = startDate ? new Date(startDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-';
    const endStr = endDate ? new Date(endDate).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '-';

    const serviceUnitRows = Object.entries(summary.by_service_unit || {})
      .map(
        ([unit, count], i) => `
        <tr>
          <td style="text-align:center; padding: 6px 8px; border: 1px solid #333;">${i + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #333; font-weight: 600;">${unit}</td>
          <td style="text-align:center; padding: 6px 8px; border: 1px solid #333; font-weight: bold;">${count}</td>
        </tr>`
      )
      .join('');

    const categoryRows = Object.entries(summary.by_category || {})
      .map(
        ([cat, count], i) => `
        <tr>
          <td style="text-align:center; padding: 6px 8px; border: 1px solid #333;">${i + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${cat}</td>
          <td style="text-align:center; padding: 6px 8px; border: 1px solid #333; font-weight: bold;">${count}</td>
        </tr>`
      )
      .join('');

    const statusRows = Object.entries(summary.by_status || {})
      .map(
        ([st, count], i) => `
        <tr>
          <td style="text-align:center; padding: 6px 8px; border: 1px solid #333;">${i + 1}</td>
          <td style="padding: 6px 8px; border: 1px solid #333;">${st}</td>
          <td style="text-align:center; padding: 6px 8px; border: 1px solid #333; font-weight: bold;">${count}</td>
        </tr>`
      )
      .join('');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Rekapitulasi Pengaduan — Kemenag Barito Utara</title>
  <style>
    body { font-family: 'Times New Roman', serif; color: #000; margin: 20px 30px; font-size: 12pt; line-height: 1.4; }
    .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; position: relative; }
    .header img { position: absolute; left: 10px; top: 5px; width: 75px; height: auto; }
    .header h2 { font-size: 14pt; margin: 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
    .header h3 { font-size: 13pt; margin: 3px 0; font-weight: bold; text-transform: uppercase; }
    .header p { font-size: 9.5pt; margin: 2px 0; font-style: italic; }
    .title-block { text-align: center; margin: 20px 0; }
    .title-block h4 { margin: 0; font-size: 12pt; text-decoration: underline; text-transform: uppercase; font-weight: bold; }
    .title-block p { margin: 4px 0 0; font-size: 10.5pt; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 10.5pt; }
    th { background-color: #f2f2f2; border: 1px solid #333; padding: 7px 8px; font-weight: bold; text-align: center; }
    .section-title { font-size: 11pt; font-weight: bold; margin-top: 15px; margin-bottom: 4px; }
    .signature-grid { margin-top: 40px; width: 100%; display: flex; justify-content: flex-end; }
    .signature-box { text-align: center; width: 250px; font-size: 11pt; }
    @media print {
      body { margin: 10mm 15mm; }
      @page { size: A4 portrait; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="/kemenag.svg" alt="Logo Kemenag">
    <h2>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h2>
    <h3>KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA</h3>
    <p>Jalan Ahmad Yani Nomor 126 Muara Teweh, Kalimantan Tengah 73812</p>
    <p>Telepon (0519) 21014 &bull; Email: baritoutara@kemenag.go.id</p>
  </div>

  <div class="title-block">
    <h4>LAPORAN REKAPITULASI PENGELOLAAN PENGADUAN &amp; ASPIRASI MASYARAKAT</h4>
    <p>Sistem Informasi SI-GESIT &bull; Periode: <strong>${startStr} s/d ${endStr}</strong></p>
  </div>

  <div class="section-title">I. Ringkasan Eksekutif</div>
  <table style="width: 100%;">
    <tr>
      <td style="padding: 4px 0; width: 35%;">Total Laporan Masuk</td>
      <td style="padding: 4px 0; font-weight: bold;">: ${summary.total} Laporan</td>
    </tr>
    <tr>
      <td style="padding: 4px 0;">Rata-rata Rating Kepuasan</td>
      <td style="padding: 4px 0; font-weight: bold;">: ${summary.avg_rating ? summary.avg_rating + ' / 5.0' : 'Belum ada rating'}</td>
    </tr>
  </table>

  <div class="section-title">II. Rekapitulasi Berdasarkan Status Penanganan</div>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">No</th>
        <th>Status Penanganan</th>
        <th style="width: 25%;">Jumlah Laporan</th>
      </tr>
    </thead>
    <tbody>
      ${statusRows}
    </tbody>
  </table>

  <div class="section-title">III. Rekapitulasi Berdasarkan Kategori Layanan</div>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">No</th>
        <th>Kategori Aspirasi / Laporan</th>
        <th style="width: 25%;">Jumlah Laporan</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRows}
    </tbody>
  </table>

  <div class="section-title">IV. Distribusi Berdasarkan Unit Layanan / Seksi</div>
  <table>
    <thead>
      <tr>
        <th style="width: 10%;">No</th>
        <th>Unit Layanan / Seksi</th>
        <th style="width: 25%;">Jumlah Laporan</th>
      </tr>
    </thead>
    <tbody>
      ${serviceUnitRows || '<tr><td colspan="3" style="text-align:center; padding:8px; border:1px solid #333;">Tidak ada data pada periode ini.</td></tr>'}
    </tbody>
  </table>

  <div class="signature-grid">
    <div class="signature-box">
      <p style="margin: 0;">Muara Teweh, ${todayStr}</p>
      <p style="margin: 4px 0 65px;">Mengetahui,<br><strong>Kepala Kantor Kementerian Agama<br>Kabupaten Barito Utara</strong></p>
      <p style="margin: 0; font-weight: bold; text-decoration: underline;">H. Arbaja, S.Ag., M.A.P.</p>
      <p style="margin: 2px 0 0; font-size: 9.5pt;">NIP. 197205151998031003</p>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  };

  const handleExportCSV = () => {
    if (!summary || !summary.items || summary.items.length === 0) {
      alert('Tidak ada data pada periode ini untuk diekspor.');
      return;
    }

    const headers = [
      'Nomor Tiket',
      'Tanggal Laporan',
      'Kategori',
      'Unit Layanan',
      'Nama Pemohon',
      'No Handphone',
      'Status',
      'Isi Pengaduan',
      'Tanggapan Resmi',
      'Rating',
      'Ulasan Feedback',
    ];

    const rows = summary.items.map((item) => [
      `"${item.ticket_number}"`,
      `"${new Date(item.created_at).toLocaleDateString('id-ID')}"`,
      `"${item.category || ''}"`,
      `"${item.service_unit || ''}"`,
      `"${item.full_name || (item.is_anonymous ? 'Anonim' : '')}"`,
      `"${item.phone_number || ''}"`,
      `"${item.status || ''}"`,
      `"${(item.content || '').replace(/"/g, '""')}"`,
      `"${(item.admin_response || '').replace(/"/g, '""')}"`,
      `"${item.rating || ''}"`,
      `"${(item.user_feedback || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Pengaduan_Kemenag_Barito_Utara_${startDate}_sd_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            <span>Rekapitulasi Laporan Kedinasan</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Ekspor laporan resmi berkala lengkap dengan Kop Surat Kemenag Barito Utara dan format kedinasan.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => fetchSummary(startDate, endDate)}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isLoading || !summary || summary.total === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Excel (CSV)</span>
          </button>
          <button
            type="button"
            onClick={handlePrintOfficialPDF}
            disabled={isLoading || !summary || summary.total === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-700/25 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF Resmi</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Filter Period Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Pilih Periode Laporan</span>
        </div>

        {/* Presets Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'q1', label: 'Triwulan I (Jan-Mar)' },
            { id: 'q2', label: 'Triwulan II (Apr-Jun)' },
            { id: 'q3', label: 'Triwulan III (Jul-Sep)' },
            { id: 'q4', label: 'Triwulan IV (Okt-Des)' },
            { id: 'semester_1', label: 'Semester I' },
            { id: 'semester_2', label: 'Semester II' },
            { id: 'this_year', label: 'Tahun Ini' },
            { id: 'custom', label: 'Kustom Tanggal' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodPreset(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                periodPreset === p.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">Tanggal Mulai</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-600">Tanggal Selesai</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodPreset('custom');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Summary Preview */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold text-slate-500">Menghitung rekapitulasi data...</p>
        </div>
      ) : !summary || summary.total === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Tidak ada data pada periode ini</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ubah tanggal atau pilih preset periode lain untuk menghasilkan laporan rekapitulasi.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Laporan</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{summary.total}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Selesai</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">{summary.by_status['Selesai'] || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Diproses</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">{summary.by_status['Diproses'] || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Rata-rata Rating</span>
              <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                {summary.avg_rating ? `${summary.avg_rating} / 5.0` : '-'}
              </p>
            </div>
          </div>

          {/* Unit Breakdown Table */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Distribusi per Unit Layanan / Seksi</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-black text-[10px] tracking-wider">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Unit Layanan / Seksi</th>
                    <th className="p-3 w-28 text-center">Jumlah</th>
                    <th className="p-3 w-32 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {Object.entries(summary.by_service_unit).map(([unit, count], idx) => {
                    const pct = ((count / summary.total) * 100).toFixed(1);
                    return (
                      <tr key={unit} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900">{unit}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{count}</td>
                        <td className="p-3 text-right text-slate-600 font-bold">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
