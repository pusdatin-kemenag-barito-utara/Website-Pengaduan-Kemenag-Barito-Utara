import * as XLSX from 'xlsx';
import type { AdminItem } from './apiAdmin';

/**
 * Ekspor data ke format spreadsheet modern Microsoft Excel (.xlsx).
 * Menggunakan static bundling XLSX untuk menjamin 100% kompatibilitas di browser tanpa runtime dynamic import failure.
 */
export function exportToExcelXlsx(items: AdminItem[], _filterSummary?: string): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  const pkg = (XLSX as any).utils ? XLSX : (XLSX as any).default || XLSX;

  // Format data baris untuk sheet Excel
  const rows = items.map((item, idx) => ({
    No: idx + 1,
    'Nomor Tiket': item.ticket_number,
    Kategori: item.category,
    'Unit Layanan Terkait': item.service_unit,
    'Nama Pemohon': item.is_anonymous ? 'Anonim (Disembunyikan)' : item.full_name || '-',
    'No Handphone / WA': item.phone_number,
    'Uraian Pengaduan': item.content,
    Status: item.status,
    'Tanggapan Resmi Admin': item.admin_response || '-',
    'Rating Kepuasan': item.rating ? `${item.rating} / 5` : '-',
    'Tanggal Pengajuan': item.created_at
      ? new Date(item.created_at).toLocaleString('id-ID', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '-',
  }));

  const ws = pkg.utils.json_to_sheet(rows);

  // Auto-fit lebar kolom (.xlsx)
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 22 }, // Nomor Tiket
    { wch: 14 }, // Kategori
    { wch: 32 }, // Unit Layanan
    { wch: 26 }, // Nama Pemohon
    { wch: 18 }, // No Handphone
    { wch: 50 }, // Uraian Pengaduan
    { wch: 14 }, // Status
    { wch: 45 }, // Tanggapan Resmi
    { wch: 16 }, // Rating Kepuasan
    { wch: 24 }, // Tanggal Pengajuan
  ];

  const wb = pkg.utils.book_new();
  pkg.utils.book_append_sheet(wb, ws, 'Rekap Pengaduan');

  // Tulis buffer format .xlsx terbaru (OpenXML Spreadsheet)
  const excelBuffer = pkg.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Laporan_Pengaduan_Kemenag_Barito_Utara_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Cetak dan ekspor laporan resmi Kemenag Barito Utara dalam format PDF via Browser Print.
 */
export function exportToPrintablePdf(items: AdminItem[], filterSummary?: string): void {
  const printTime = new Date().toLocaleString('id-ID', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const tableRows = items
    .map((item, idx) => {
      const createdDate = item.created_at
        ? new Date(item.created_at).toLocaleDateString('id-ID', {
            day: '2-digit', month: 'short', year: 'numeric',
          })
        : '-';
      const reporter = item.is_anonymous ? 'Anonim' : item.full_name || '-';
      const response = item.admin_response || '-';
      const rating = item.rating ? `${item.rating}/5 &#9733;` : '-';

      return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td style="font-family:monospace;font-weight:bold;color:#064e3b;white-space:nowrap;">${item.ticket_number}</td>
        <td style="text-align:center;font-weight:bold;">${item.category}</td>
        <td>${item.service_unit}</td>
        <td>${reporter}</td>
        <td style="font-family:monospace;white-space:nowrap;">${item.phone_number}</td>
        <td style="text-align:center;"><span class="badge status-${item.status}">${item.status}</span></td>
        <td style="text-align:center;white-space:nowrap;">${createdDate}</td>
        <td>${response}</td>
        <td style="text-align:center;">${rating}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Pengaduan SI-GESIT Kemenag Barito Utara</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 9pt; color: #1e293b; margin: 0; padding: 0; }
    .header-box { text-align: center; border-bottom: 2.5px solid #064e3b; padding-bottom: 8px; margin-bottom: 12px; }
    .instansi-title { font-size: 10pt; font-weight: bold; color: #334155; margin: 0; letter-spacing: 0.5px; }
    .satker-title { font-size: 13pt; font-weight: 900; color: #064e3b; margin: 2px 0; }
    .app-title { font-size: 9pt; font-weight: bold; color: #0f172a; margin: 0; }
    .contact-title { font-size: 7.5pt; color: #64748b; margin: 2px 0 0 0; }
    .report-title { font-size: 11pt; font-weight: 900; text-align: center; text-transform: uppercase; margin: 10px 0 4px 0; color: #0f172a; }
    .meta-bar { font-size: 8pt; color: #475569; text-align: center; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; margin-top: 4px; }
    th { background-color: #064e3b; color: white; padding: 6px 4px; font-weight: bold; text-align: left; border: 1px solid #042f2e; }
    td { padding: 5px 4px; border: 1px solid #cbd5e1; vertical-align: top; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; }
    .status-Menunggu { background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .status-Diproses { background-color: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .status-Selesai { background-color: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .status-Ditolak { background-color: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .footer { margin-top: 20px; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b; }
    .signature { margin-top: 25px; float: right; text-align: center; width: 220px; font-size: 8.5pt; }
    .signature-space { height: 50px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <p class="instansi-title">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
    <h1 class="satker-title">KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA</h1>
    <p class="app-title">SISTEM INFORMASI GAGASAN, EVALUASI, SARAN, INFORMASI DAN TANGGAPAN (SI-GESIT)</p>
    <p class="contact-title">Jl. Ahmad Yani No. 126 Muara Teweh, Kalimantan Tengah &bull; Website: kemenag-baritoutara.com &bull; Email: baritoutara@kemenag.go.id</p>
  </div>

  <div class="report-title">LAPORAN REKAPITULASI PENGADUAN &amp; ASPIRASI MASYARAKAT</div>
  <div class="meta-bar">Dicetak: ${printTime} &nbsp;|&nbsp; ${filterSummary || 'Semua Kategori &amp; Status'} &nbsp;|&nbsp; Total Data: <strong>${items.length}</strong> Tiket</div>

  <table>
    <thead>
      <tr>
        <th style="width:25px;text-align:center;">No</th>
        <th style="width:115px;text-align:center;">No. Tiket</th>
        <th style="width:70px;text-align:center;">Kategori</th>
        <th style="width:125px;">Unit Layanan</th>
        <th style="width:105px;">Nama Pemohon</th>
        <th style="width:90px;text-align:center;">No HP / WA</th>
        <th style="width:65px;text-align:center;">Status</th>
        <th style="width:80px;text-align:center;">Tgl Masuk</th>
        <th>Tanggapan Resmi Admin</th>
        <th style="width:45px;text-align:center;">Rating</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <div style="margin-top:20px; overflow:hidden;">
    <div class="signature">
      <div>Muara Teweh, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div style="font-weight:bold;margin-top:2px;">Pengelola Layanan SI-GESIT,</div>
      <div class="signature-space"></div>
      <div style="font-weight:bold;text-decoration:underline;">TIM PENGADUAN KEMENAG</div>
      <div style="color:#64748b;font-size:7.5pt;">Kemenag Barito Utara</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=1100,height=750');
  if (printWindow) {
    printWindow.document.documentElement.innerHTML = html;
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 350);
  } else {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Pengaduan_SI_GESIT_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
