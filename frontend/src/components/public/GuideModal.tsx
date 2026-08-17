import { X } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideModal({ isOpen, onClose }: GuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-[92vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white hover:bg-slate-900 border border-white/30 flex items-center justify-center shadow-xl transition-all cursor-pointer"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="overflow-y-auto max-h-[88vh] rounded-2xl">
          <img
            src="/pengaduan-v2.webp"
            alt="Alur Pengaduan Kemenag Barito Utara"
            className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
}
