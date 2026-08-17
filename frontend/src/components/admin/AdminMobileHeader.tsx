import { LogOut, Menu } from 'lucide-react';

interface AdminMobileHeaderProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
}

export default function AdminMobileHeader({
  isSidebarOpen,
  setIsSidebarOpen,
  onLogout,
}: AdminMobileHeaderProps) {
  return (
    <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-black text-base text-slate-900">SI-GESIT Admin</h1>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
        title="Keluar"
      >
        <LogOut className="w-5 h-5" />
      </button>
    </header>
  );
}
