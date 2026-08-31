// Generator bukti tiket PNG via native Canvas 2D (port dari legacy Next.js).
// Membuat dokumen resmi 1200x1500 px dengan KOP Kemenag, QR code, dan rincian data.

export interface TicketDetails {
  ticket: string;
  category: string;
  serviceUnit: string;
  fullName: string;
  phone: string;
  isAnonymous: boolean;
  content: string;
  attachmentName?: string;
  eventDate?: string;
  status: string;
  createdAt: string;
}

// QR canvas dicari di dalam container ref (dihindari query global antar-komponen).
export async function generateTicketPng(details: TicketDetails, qrContainer?: HTMLElement | null): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1500;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // 1. Background Fill & Outer Border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1200, 1500);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 8;
  ctx.strokeRect(30, 30, 1140, 1440);

  // 2. Kemenag KOP Header Box & Logo
  ctx.fillStyle = '#064e3b';
  ctx.fillRect(60, 60, 1080, 8);

  const logoImg = new Image();
  logoImg.crossOrigin = 'anonymous';
  await new Promise<void>((resolve) => {
    logoImg.onload = () => resolve();
    logoImg.onerror = () => resolve();
    logoImg.src = '/kemenag.svg';
  });

  if (logoImg.complete && logoImg.naturalWidth > 0) {
    ctx.drawImage(logoImg, 70, 95, 100, 100);
  }

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KEMENTERIAN AGAMA REPUBLIK INDONESIA', 190, 115);

  ctx.fillStyle = '#022c22';
  ctx.font = '900 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA', 190, 150);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan (SI-GESIT)', 190, 178);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Jl. Ahmad Yani No. 126 Muara Teweh, Kalimantan Tengah • Email: baritoutara@kemenag.go.id', 190, 202);

  // Double Line Rule
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(60, 220, 1080, 4);
  ctx.fillRect(60, 228, 1080, 1);

  // 3. Ticket Code Header Box
  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.roundRect(60, 255, 1080, 190, 24);
  ctx.fill();

  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NOMOR TIKET RESMI SI-GESIT', 95, 305);

  ctx.fillStyle = '#34d399';
  ctx.font = '900 44px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(details.ticket, 95, 365);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`Status Laporan: ${details.status}   •   Waktu Kirim: ${details.createdAt}`, 95, 410);

  // Draw QR Code onto Canvas (dari QR canvas di DOM dalam container ref)
  const qrCanvas = qrContainer?.querySelector('canvas');
  if (qrCanvas) {
    try {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(960, 280, 140, 140, 16);
      ctx.fill();
      ctx.drawImage(qrCanvas, 970, 290, 120, 120);
    } catch {
      /* QR opsional */
    }
  }

  // 4. Data Details Table Card
  ctx.fillStyle = '#64748b';
  ctx.font = '900 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('RINCIAN DATA PENGAJUAN MASYARAKAT', 60, 485);
  ctx.fillRect(60, 495, 1080, 2);

  const fields = [
    { label: 'Kategori Laporan:', val: details.category },
    { label: 'Terkait Unit Layanan:', val: details.serviceUnit },
    { label: 'Nama Pelapor / Pengadu:', val: details.isAnonymous ? 'Anonim (Identitas Disembunyikan)' : details.fullName },
    { label: 'Nomor WhatsApp / HP:', val: details.phone },
    ...(details.eventDate ? [{ label: 'Tanggal Kejadian:', val: details.eventDate }] : []),
    ...(details.attachmentName ? [{ label: 'Lampiran Berkas:', val: details.attachmentName }] : []),
  ];

  let currentY = 535;
  fields.forEach((f) => {
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(f.label, 60, currentY);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(f.val, 340, currentY);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(60, currentY + 15, 1080, 1);
    currentY += 50;
  });

  // 5. Uraian Text Box (wrap otomatis)
  currentY += 20;
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(60, currentY, 1080, 240, 20);
  ctx.fill();

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('ISI URAIAN & CATATAN PENGAJUAN:', 85, currentY + 35);

  ctx.fillStyle = '#0f172a';
  ctx.font = '15px "Plus Jakarta Sans", sans-serif';

  const lines = details.content.split('\n');
  let lineY = currentY + 70;
  for (let l = 0; l < lines.length && lineY < currentY + 220; l++) {
    const words = lines[l].split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 1000 && n > 0) {
        ctx.fillText(line, 85, lineY);
        line = words[n] + ' ';
        lineY += 24;
        if (lineY > currentY + 215) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 85, lineY);
    lineY += 24;
  }

  // 6. Verification Footer
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(60, 1380, 1080, 2);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SI-GESIT \u2022 Kementerian Agama Kabupaten Barito Utara', 60, 1415);

  ctx.fillStyle = '#64748b';
  ctx.font = '13px sans-serif';
  ctx.fillText('Harap simpan bukti tiket ini untuk melakukan cek status penanganan secara online.', 60, 1438);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('DOKUMEN RESMI OTENTIK DIGITAL', 900, 1425);

  // 7. Direct PNG File Download Trigger
  const dataUrl = canvas.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `Bukti_Tiket_${details.ticket}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}