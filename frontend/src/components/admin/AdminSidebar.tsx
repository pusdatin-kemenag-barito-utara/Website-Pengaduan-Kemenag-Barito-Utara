import {
  BarChart3, FolderKanban, LogOut, Sliders, X,
} from 'lucide-react';
import type { Tab } from './types';

interface AdminSidebarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  totalPengaduanCount: number;
  onLogout: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  totalPengaduanCount,
  onLogout,
}: AdminSidebarProps) {
  return (
    <aside
      className={`fixed lg:sticky top-0 z-40 h-screen w-72 bg-slate-900 text-slate-200 flex flex-col justify-between p-5 shadow-2xl transition-all duration-300 shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="space-y-8">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-2xl bg-emerald-950 border border-emerald-800/60 shrink-0">
              <img src="/kemenag.svg" alt="Logo Kemenag" className="object-contain w-9 h-9" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-lg text-white tracking-tight truncate">PANEL SI-GESIT</h1>
              <p className="text-[11px] text-emerald-400 font-bold tracking-wide uppercase truncate">Kemenag Barito Utara</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('pengaduan')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'pengaduan'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <FolderKanban className="w-5 h-5" />
              <span>Daftar Pengaduan</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300">
              {totalPengaduanCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('layanan')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'layanan'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5" />
              <span>Kelola Layanan</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-emerald-400">Dinamis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statistik')}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === 'statistik'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5" />
              <span>Statistik</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-violet-400">Grafik</span>
          </button>
        </nav>
      </div>

      {/* Clean Bottom Logout */}
      <div className="border-t border-slate-800/80 pt-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full px-4 py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar Admin</span>
        </button>
      </div>
    </aside>
  );
}
