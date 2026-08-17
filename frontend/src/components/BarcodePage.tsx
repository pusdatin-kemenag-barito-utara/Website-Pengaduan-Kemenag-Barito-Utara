import { useRef, useState } from 'react';
import { Download, QrCode, ArrowLeft, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function BarcodePage() {
  const [targetUrl, setTargetUrl] = useState<string>('http://pengaduan.kemenag-baritoutara.com');
  const qrRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const handleDownloadQR = async () => {
    if (!qrRef.current) return;
    setIsDownloading(true);
    try {
      const svgElement = qrRef.current.querySelector('svg');
      if (!svgElement) throw new Error('QR SVG not found');
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Background Putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const qrImg = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = () => resolve();
        qrImg.src = svgUrl;
      });

      // QR Code pusat
      const qrSize = 860;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = (canvas.height - qrSize) / 2;
      if (qrImg.complete && qrImg.naturalWidth > 0) {
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }

      // Logo Kemenag di tengah QR
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = '/kemenag.svg';
      });
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoSize = 180;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = (canvas.height - logoSize) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(logoX - 12, logoY - 12, logoSize + 24, logoSize + 24, 24);
        ctx.fill();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      }

      URL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'QR_SIGESIT.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('Error generating QR:', err);
      alert('Gagal mengunduh QR Code. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 flex flex-col font-sans print:bg-white">
      {/* Header */}
      <header className="w-full bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3.5">
          <a
            href="/"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <img src="/kemenag.svg" alt="Logo Kemenag" className="w-10 h-10 object-contain" />
          <div>
            <h1 className="font-black text-base sm:text-lg text-slate-900 leading-tight">Barcode QR SI-GESIT</h1>
            <p className="text-xs text-slate-500 font-semibold">Kementerian Agama Kabupaten Barito Utara</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadQR}
            disabled={isDownloading}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-emerald-200" /> {isDownloading ? 'Mengunduh...' : 'Download PNG'}
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 print:border-none print:shadow-none print:max-w-none">
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <QrCode className="w-7 h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900">Pindai untuk Membuka Portal Pengaduan</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Arahkan kamera ponsel ke QR Code untuk langsung menuju portal layanan pengaduan SI-GESIT.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center space-y-4 shadow-inner">
            <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-md border border-slate-200/80 inline-block">
              <QRCodeSVG value={targetUrl} size={220} level="H" />
            </div>
            <div className="w-full flex items-center gap-2 text-left">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-extrabold shrink-0">URL</span>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://pengaduan.kemenag-baritoutara.com"
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Barcode resmi dipasang di area layanan publik kantor Kemenag Barito Utara.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 print:hidden">
        &copy; {new Date().getFullYear()} SI-GESIT - Kementerian Agama Kabupaten Barito Utara.
      </footer>
    </div>
  );
}