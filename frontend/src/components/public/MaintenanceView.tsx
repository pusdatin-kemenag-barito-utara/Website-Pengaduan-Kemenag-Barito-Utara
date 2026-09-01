import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Settings, Wrench } from 'lucide-react';
import { getAppStatus } from '../../lib/api';

export default function MaintenanceView() {
  const [appName, setAppName] = useState<string>('Pengaduan SI-GESIT');

  useEffect(() => {
    // 1. Lock history navigation to prevent bypass via browser back/forward buttons
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', window.location.href);

      const lockHistory = () => {
        window.history.pushState(null, '', window.location.href);
      };

      window.addEventListener('popstate', lockHistory);

      // 2. Real-time auto-recovery polling (every 5 seconds)
      const checkStatus = async () => {
        try {
          const res = await getAppStatus();
          if (res.app_name) setAppName(res.app_name);
          if (!res.is_maintenance || res.status !== 'maintenance') {
            window.location.replace('/');
          }
        } catch {
          /* ignore temporary network blips */
        }
      };

      // Initial check on mount
      void checkStatus();

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void checkStatus();
        }
      }, 5000);

      const onFocus = () => {
        void checkStatus();
      };
      window.addEventListener('focus', onFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('popstate', lockHistory);
        window.removeEventListener('focus', onFocus);
      };
    }
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 overflow-hidden font-sans">
      {/* Background Ornaments (Pusdatin Official Style) */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />

      {/* Explicit CSS Keyframes for smooth infinite rotation */}
      <style>{`
        @keyframes pusdatinSpinClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pusdatinSpinCounter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
      `}</style>

      <div className="relative z-10 mx-auto max-w-2xl px-6 py-12 text-center animate-in fade-in duration-500">
        {/* Animated Rotating Gear (Pusdatin Official Style) */}
        <div className="mb-8 flex justify-center">
          <div
            className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100"
            style={{ animation: 'pusdatinSpinClockwise 8s linear infinite' }}
          >
            <Settings className="h-12 w-12 text-emerald-600" />
            <div
              className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg"
              style={{ animation: 'pusdatinSpinCounter 12s linear infinite' }}
            >
              <Wrench className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Sistem Sedang Pemeliharaan
        </h1>

        {/* Description */}
        <p className="mb-8 text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
          Aplikasi <strong>{appName}</strong> saat ini sedang dalam mode perbaikan terpusat oleh Tim Pusdatin Kemenag Barito Utara. Kami sedang melakukan peningkatan sistem untuk memberikan pengalaman yang lebih baik.
        </p>

        {/* Status Badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 border border-amber-200/50">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Akses Sementara Ditutup</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-200/50">
            <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Silakan periksa kembali nanti</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Pusdatin Kemenag Barito Utara
        </div>
      </div>
    </div>
  );
}
