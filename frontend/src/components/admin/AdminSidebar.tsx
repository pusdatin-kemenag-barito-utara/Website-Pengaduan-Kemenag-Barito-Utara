import {
  BarChart3,
  FileSpreadsheet,
  FolderKanban,
  LogOut,
  MessageSquareQuote,
  Settings,
  Sliders,
  Star,
  X,
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
  const menuGroups = [
    {
      groupLabel: 'Utama',
      items: [
        {
          id: 'pengaduan' as Tab,
          label: 'Daftar Pengaduan',
          icon: FolderKanban,
          count: totalPengaduanCount > 0 ? totalPengaduanCount : undefined,
        },
        {
          id: 'rating' as Tab,
          label: 'Ulasan & Kepuasan',
          icon: Star,
        },
        {
          id: 'statistik' as Tab,
          label: 'Statistik & Analitik',
          icon: BarChart3,
        },
      ],
    },
    {
      groupLabel: 'Manajemen Layanan',
      items: [
        {
          id: 'layanan' as Tab,
          label: 'Kelola Layanan',
          icon: Sliders,
        },
        {
          id: 'template' as Tab,
          label: 'Template Tanggapan',
          icon: MessageSquareQuote,
        },
      ],
    },
    {
      groupLabel: 'Laporan & Sistem',
      items: [
        {
          id: 'laporan' as Tab,
          label: 'Rekap Laporan',
          icon: FileSpreadsheet,
        },
        {
          id: 'settings' as Tab,
          label: 'Pengaturan Sistem',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className={`fixed lg:sticky top-0 z-40 h-screen w-72 bg-slate-900 text-slate-200 flex flex-col justify-between p-4 sm:p-5 shadow-2xl transition-all duration-300 shrink-0 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Header Branding */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-2xl bg-emerald-950 border border-emerald-800/60 shrink-0 shadow-inner">
              <img src="/kemenag.svg" alt="Logo Kemenag" className="object-contain w-8 h-8" />
            </div>
            <div className="min-w-0">
              <h1 className="font-black text-base text-white tracking-tight truncate">PANEL SI-GESIT</h1>
              <p className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase truncate">
                Kemenag Barito Utara
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Tutup menu sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menus */}
        <div className="flex-1 overflow-y-auto py-3 space-y-5 pr-1 my-1 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.groupLabel} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {group.groupLabel}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer group ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-400 group-hover:scale-105'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {typeof item.count === 'number' && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-tight shrink-0 ${
                            isActive
                              ? 'bg-emerald-700/80 text-white'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Clean Bottom Logout */}
        <div className="border-t border-slate-800/80 pt-3 shrink-0">
          <button
            type="button"
            onClick={onLogout}
            className="w-full px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
