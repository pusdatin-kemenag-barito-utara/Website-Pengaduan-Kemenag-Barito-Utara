import { Search } from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
}

export default function Header({ onOpenSearch }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-8 md:px-12 py-2.5 sm:py-3.5 shadow-xs transition-all print:hidden">
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs shrink-0 flex items-center justify-center">
            <img
              src="/kemenag.svg"
              alt="Logo Kementerian Agama Republik Indonesia"
              width="40"
              height="40"
              className="object-contain shrink-0 w-8 h-8 sm:w-10 sm:h-10"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-black text-lg sm:text-2xl tracking-tight text-slate-900 leading-none">SI-GESIT</h1>
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-extrabold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                Barito Utara
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 hidden sm:block font-medium truncate mt-0.5">
              <span className="text-emerald-700 font-black">S</span>istem <span className="text-emerald-700 font-black">I</span>nformasi <span className="text-emerald-700 font-black">G</span>agasan, <span className="text-emerald-700 font-black">E</span>valuasi, <span className="text-emerald-700 font-black">S</span>aran, <span className="text-emerald-700 font-black">I</span>nformasi dan <span className="text-emerald-700 font-black">T</span>anggapan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Lacak Tiket Pengaduan"
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-emerald-700/20 active:scale-95 cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4 text-white shrink-0" />
            <span>Lacak Tiket</span>
          </button>
        </div>
      </div>
    </header>
  );
}
