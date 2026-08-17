import type { RefObject } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { SubmittedDetails } from './types';

interface PrintableTicketProps {
  details: SubmittedDetails | null;
  ticketRef: RefObject<HTMLDivElement | null>;
  qrValue: string;
}

export default function PrintableTicket({ details, ticketRef, qrValue }: PrintableTicketProps) {
  if (!details) return null;

  return (
    <div
      ref={ticketRef}
      style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '32px', fontFamily: 'sans-serif' }}
      className="hidden print:block fixed inset-0 z-[9999] leading-relaxed"
    >
      <div style={{ borderBottom: '4px solid #0f172a', paddingBottom: '8px', marginBottom: '24px' }}>
        <div className="flex items-center justify-between gap-4 pb-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 relative shrink-0">
              <img src="/kemenag.svg" alt="Logo Kemenag" className="object-contain w-16 h-16" />
            </div>
            <div>
              <h2 style={{ color: '#334155' }} className="text-xs font-bold tracking-wider uppercase">
                KEMENTERIAN AGAMA REPUBLIK INDONESIA
              </h2>
              <h1 style={{ color: '#022c22' }} className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight">
                KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA
              </h1>
              <p style={{ color: '#334155' }} className="text-[11px] font-bold mt-0.5">
                Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan (SI-GESIT)
              </p>
              <p style={{ color: '#64748b' }} className="text-[10px] font-medium">
                Jl. Ahmad Yani No. 126 Muara Teweh, Kalimantan Tengah {'\u2022'} Email: baritoutara@kemenag.go.id
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span style={{ backgroundColor: '#d1fae5', color: '#064e3b', borderColor: '#34d399' }} className="inline-block px-3.5 py-1 text-xs font-black rounded-full border">
              BUKTI TIKET RESMI
            </span>
          </div>
        </div>
        <div style={{ borderBottom: '1px solid #0f172a', paddingTop: '2px' }} />
      </div>

      <div style={{ backgroundColor: '#090d16', color: '#ffffff', borderColor: '#059669', padding: '24px', borderRadius: '24px' }} className="mb-6 flex items-center justify-between border-2 shadow-xl">
        <div className="space-y-1">
          <span style={{ color: '#94a3b8' }} className="text-xs font-bold uppercase tracking-wider block">
            NOMOR TIKET RESMI SI-GESIT
          </span>
          <span style={{ color: '#34d399' }} className="font-mono text-3xl font-black tracking-widest block">
            {details.ticket}
          </span>
          <p style={{ color: '#cbd5e1' }} className="text-xs font-medium pt-1">
            Status Laporan: <strong style={{ color: '#fbbf24' }} className="font-bold">{details.status}</strong> {'\u2022'} Waktu
            Kirim: {details.createdAt}
          </p>
        </div>
        <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '16px' }} className="shrink-0 shadow-md flex flex-col items-center">
          <QRCodeCanvas value={qrValue} size={95} level="H" />
          <span style={{ color: '#64748b' }} className="text-[9px] font-bold mt-1 uppercase tracking-tighter">
            Pindai Cek Status
          </span>
        </div>
      </div>

      <div className="space-y-4 text-xs mb-8">
        <h3 style={{ color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }} className="text-xs font-black uppercase tracking-wider">
          Rincian Data Pengajuan Masyarakat
        </h3>

        <table className="w-full text-left border-collapse">
          <tbody>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold w-48">
                Kategori Laporan:
              </td>
              <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-extrabold text-sm">
                {details.category}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                Terkait Unit Layanan:
              </td>
              <td style={{ color: '#022c22', padding: '12px 0' }} className="font-extrabold text-sm">
                {details.serviceUnit}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                Nama Pelapor / Pengadu:
              </td>
              <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-extrabold text-sm">
                {details.isAnonymous ? 'Anonim (Identitas Disembunyikan)' : details.fullName}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                Nomor WhatsApp / HP:
              </td>
              <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-mono font-extrabold text-sm">
                {details.phone}
              </td>
            </tr>
            {details.eventDate && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                  Tanggal Kejadian:
                </td>
                <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-extrabold text-sm">
                  {details.eventDate}
                </td>
              </tr>
            )}
            {details.attachmentName && (
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                  Lampiran Berkas Pendukung:
                </td>
                <td style={{ color: '#065f46', padding: '12px 0' }} className="font-extrabold text-sm">
                  {details.attachmentName}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', padding: '20px', borderRadius: '16px' }} className="border mt-4">
          <span style={{ color: '#94a3b8' }} className="text-[11px] font-extrabold block mb-2 uppercase tracking-wider">
            Isi Uraian &amp; Catatan Pengajuan:
          </span>
          <div style={{ color: '#0f172a' }} className="text-xs font-medium whitespace-pre-wrap leading-relaxed">
            {details.content}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '2px dashed #94a3b8', paddingTop: '16px' }} className="mt-12 flex items-center justify-between text-[11px]">
        <div>
          <p style={{ color: '#0f172a' }} className="font-extrabold">
            SI-GESIT {'\u2022'} Kementerian Agama Kabupaten Barito Utara
          </p>
          <p style={{ color: '#64748b' }} className="text-[10px]">
            Harap simpan bukti fisik / PDF nomor tiket ini untuk melakukan cek status penanganan secara online.
          </p>
        </div>
        <div style={{ color: '#94a3b8' }} className="text-right font-mono font-extrabold text-[10px]">
          DOKUMEN RESMI OTENTIK DIGITAL
        </div>
      </div>
    </div>
  );
}
