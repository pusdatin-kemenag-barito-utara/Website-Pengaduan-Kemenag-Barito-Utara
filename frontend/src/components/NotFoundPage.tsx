import { ArrowLeft, Home } from 'lucide-react';

interface NotFoundPageProps {
  currentPath?: string;
}

export default function NotFoundPage({ currentPath = '' }: NotFoundPageProps) {
  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-100 text-slate-800 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Logo Kemenag */}
        <div className="inline-flex flex-col items-center gap-2">
          <div className="w-14 h-14 p-2.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mx-auto">
            <img src="/kemenag.svg" alt="Logo Kemenag" className="w-full h-full object-contain" />
          </div>
          <p className="text-[11px] font-extrabold text-emerald-800 tracking-wider uppercase">
            SI-GESIT • Kemenag Barito Utara
          </p>
        </div>

        {/* Big Bold 404 Focus */}
        <div className="space-y-1">
          <h1 className="text-8xl sm:text-9xl font-black text-slate-900 tracking-tighter leading-none select-none font-mono">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 pt-2">
            Halaman Tidak Ditemukan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
            Maaf, alamat URL yang Anda tuju tidak tersedia atau telah dipindahkan.
          </p>
        </div>

        {/* Path Indicator */}
        {currentPath && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-mono max-w-full truncate">
            <span className="text-slate-400 font-bold">Path:</span>
            <span className="text-emerald-700 font-extrabold truncate">{currentPath}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </a>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
            <span>Halaman Sebelumnya</span>
          </button>
        </div>
      </div>
    </div>
  );
}
