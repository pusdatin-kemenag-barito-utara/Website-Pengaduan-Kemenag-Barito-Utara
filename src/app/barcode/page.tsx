'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Download, QrCode, ArrowLeft, Printer } from 'lucide-react';

export default function BarcodePage() {
  const [targetUrl, setTargetUrl] = useState<string>('http://pengaduan.kemenag-baritoutara.com');
  const qrRef = useRef<HTMLDivElement>(null);

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const qrImg = new window.Image();

    qrImg.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;

      if (ctx) {
        // 1. Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Draw QR Base Image
        ctx.drawImage(qrImg, 0, 0, canvas.width, canvas.height);

        // 3. Overlay Logo Kemenag in the exact center
        const logoImg = new window.Image();
        logoImg.onload = () => {
          const logoSize = 180;
          const logoX = (canvas.width - logoSize) / 2;
          const logoY = (canvas.height - logoSize) / 2;

          ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

          // 4. Convert to PNG and download
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `QR_SI-GESIT_Kemenag_BaritoUtara.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        };
        logoImg.src = '/kemenag.svg';
      }
    };

    qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 sm:px-8 py-4 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Image
              src="/kemenag.svg"
              alt="Logo Kemenag"
              width={36}
              height={36}
              className="object-contain shrink-0"
              priority
            />
            <div>
              <h1 className="font-black text-base sm:text-lg text-slate-900 leading-tight">Barcode QR SI-GESIT</h1>
              <p className="text-xs text-slate-500 font-semibold">Kementerian Agama Kabupaten Barito Utara</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" /> <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={handleDownloadQR}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer"
          >
            <Download className="w-4 h-4" /> Unduh QR PNG
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 print:border-none print:shadow-none print:max-w-none">
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
              <QrCode className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">QR Code Layanan Pengaduan</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Pindai QR Code di bawah ini untuk mengakses aplikasi pengaduan masyarakat SI-GESIT
            </p>
          </div>

          {/* QR Code Container with Central Logo */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col items-center justify-center space-y-4 shadow-inner">
            <div ref={qrRef} className="p-4 bg-white rounded-2xl shadow-md border border-slate-200/80 inline-block">
              <QRCodeSVG
                value={targetUrl}
                size={240}
                bgColor="#FFFFFF"
                fgColor="#000000"
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: '/kemenag.svg',
                  x: undefined,
                  y: undefined,
                  height: 48,
                  width: 48,
                  excavate: true,
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-emerald-800 font-bold bg-white px-3 py-1 rounded-full border border-emerald-200 shadow-xs">
              {targetUrl}
            </span>
          </div>

          {/* Editable URL Settings Input */}
          <div className="space-y-2 text-left print:hidden">
            <label htmlFor="urlInput" className="block text-xs font-bold text-slate-700">
              Kustomisasi URL Tujuan QR Code:
            </label>
            <input
              type="url"
              id="urlInput"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-semibold focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Action Download Buttons */}
          <button
            onClick={handleDownloadQR}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer print:hidden"
          >
            <Download className="w-5 h-5" /> Download QR Code (High Res PNG)
          </button>
        </div>
      </main>
    </div>
  );
}
