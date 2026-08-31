import { Trash2 } from 'lucide-react';
import type { AdminItem } from '../../lib/apiAdmin';

interface DeleteComplaintModalProps {
  itemToDelete: AdminItem | null;
  onClose: () => void;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export default function DeleteComplaintModal({
  itemToDelete,
  onClose,
  onConfirmDelete,
  isDeleting,
}: DeleteComplaintModalProps) {
  if (!itemToDelete) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-900">Hapus Tiket Pengaduan?</h3>
          <p className="text-xs text-slate-500 font-medium">
            Apakah Anda yakin ingin menghapus tiket{' '}
            <span className="font-bold text-slate-900">#{itemToDelete.ticket_number}</span>? Tindakan ini
            tidak dapat dibatalkan.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirmDelete}
            className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? 'Menghapus...' : 'Ya, Hapus Tiket'}
          </button>
        </div>
      </div>
    </div>
  );
}
