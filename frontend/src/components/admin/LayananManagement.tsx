import { useRef, useState, type Dispatch, type SetStateAction } from 'react';
import {
  Check, CheckCircle, Edit, GripVertical, Plus, Trash2, X,
} from 'lucide-react';
import type { Layanan } from '../../lib/api';
import {
  adminCreateLayanan, adminDeleteLayanan, adminReorderLayanan, adminUpdateLayanan,
} from '../../lib/apiAdmin';

interface LayananManagementProps {
  layananList: Layanan[];
  setLayananList: Dispatch<SetStateAction<Layanan[]>>;
  isLayananLoading: boolean;
  onRefreshLayanan: () => Promise<void>;
}

export default function LayananManagement({
  layananList,
  setLayananList,
  isLayananLoading,
  onRefreshLayanan,
}: LayananManagementProps) {
  // Modal CRUD State
  const [isLayananModalOpen, setIsLayananModalOpen] = useState<boolean>(false);
  const [editingLayanan, setEditingLayanan] = useState<Layanan | null>(null);
  const [layananName, setLayananName] = useState<string>('');
  const [layananDesc, setLayananDesc] = useState<string>('');
  const [layananActive, setLayananActive] = useState<boolean>(true);
  const [isSavingLayanan, setIsSavingLayanan] = useState<boolean>(false);

  // Delete State
  const [layananToDelete, setLayananToDelete] = useState<Layanan | null>(null);
  const [isDeletingLayanan, setIsDeletingLayanan] = useState<boolean>(false);

  // Drag & Drop Reorder State
  const [reorderMsg, setReorderMsg] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const draggedIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragState, setDragState] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });

  const handleOpenCreate = () => {
    setEditingLayanan(null);
    setLayananName('');
    setLayananDesc('');
    setLayananActive(true);
    setIsLayananModalOpen(true);
  };

  const handleOpenEdit = (layanan: Layanan) => {
    setEditingLayanan(layanan);
    setLayananName(layanan.name);
    setLayananDesc(layanan.description || '');
    setLayananActive(layanan.is_active !== false);
    setIsLayananModalOpen(true);
  };

  const handleSaveLayanan = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!layananName.trim()) return;
    setIsSavingLayanan(true);
    try {
      if (editingLayanan) {
        await adminUpdateLayanan(editingLayanan.id, {
          name: layananName.trim(),
          description: layananDesc.trim() || null,
          is_active: layananActive,
        });
      } else {
        await adminCreateLayanan({
          name: layananName.trim(),
          description: layananDesc.trim() || undefined,
          is_active: layananActive,
        });
      }
      setIsLayananModalOpen(false);
      await onRefreshLayanan();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan layanan.');
    } finally {
      setIsSavingLayanan(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!layananToDelete) return;
    setIsDeletingLayanan(true);
    try {
      await adminDeleteLayanan(layananToDelete.id);
      setLayananList((prev) => prev.filter((l) => l.id !== layananToDelete.id));
      setLayananToDelete(null);
      await onRefreshLayanan();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus layanan.');
    } finally {
      setIsDeletingLayanan(false);
    }
  };

  const commitReorder = async (next: Layanan[]) => {
    setLayananList(next);
    setIsReordering(true);
    setReorderMsg(null);
    try {
      await adminReorderLayanan(next.map((l) => l.id));
      setReorderMsg('Urutan layanan berhasil disimpan.');
      setTimeout(() => setReorderMsg(null), 4000);
    } catch (err) {
      setReorderMsg(`Gagal menyimpan urutan: ${err instanceof Error ? err.message : 'kesalahan'}`);
    } finally {
      setIsReordering(false);
    }
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const from = draggedIndex.current;
    draggedIndex.current = null;
    dragOverIndex.current = null;
    setDragState({ from: null, over: null });
    if (from === null || from === index) return;
    const next = [...layananList];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    void commitReorder(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Kelola Terkait Layanan</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Tambah, ubah, atur urutan posisi, atau hapus opsi layanan Kemenag secara dinamis.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Tambah Layanan Baru
        </button>
      </div>

      {reorderMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reorderMsg}</span>
        </div>
      )}

      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Petunjuk: Tarik &amp; geser (Drag &amp; Drop) ikon pegangan pada baris tabel untuk mengatur urutan posisi layanan.</span>
        </div>
        {isReordering && (
          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg animate-pulse shrink-0">
            Menyimpan urutan...
          </span>
        )}
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 sm:p-5">Urutan</th>
                <th className="p-4 sm:p-5">Nama Unit Layanan</th>
                <th className="p-4 sm:p-5">Keterangan / Deskripsi</th>
                <th className="p-4 sm:p-5">Status Layanan</th>
                <th className="p-4 sm:p-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLayananLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    Memuat daftar opsi layanan...
                  </td>
                </tr>
              ) : layananList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    Belum ada opsi layanan terdaftar. Klik &quot;+ Tambah Layanan Baru&quot; untuk membuat layanan.
                  </td>
                </tr>
              ) : (
                layananList.map((layanan, index) => (
                  <tr
                    key={layanan.id}
                    draggable
                    onDragStart={() => {
                      draggedIndex.current = index;
                      setDragState({ from: index, over: null });
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      dragOverIndex.current = index;
                      setDragState((prev) => ({ ...prev, over: index }));
                    }}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={() => {
                      draggedIndex.current = null;
                      dragOverIndex.current = null;
                      setDragState({ from: null, over: null });
                    }}
                    className={`transition-all duration-150 ${
                      dragState.from === index
                        ? 'opacity-30 bg-emerald-100/60 scale-[0.99]'
                        : dragState.over === index
                          ? 'border-2 border-dashed border-emerald-500 bg-emerald-50/80 shadow-md'
                          : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                          title="Geser untuk mengubah posisi urutan"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <span className="font-extrabold text-slate-400">{index + 1}</span>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 font-black text-slate-900">{layanan.name}</td>
                    <td className="p-4 sm:p-5 text-slate-600 max-w-xs">{layanan.description || '-'}</td>
                    <td className="p-4 sm:p-5">
                      {layanan.is_active !== false ? (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Aktif
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-500 border border-slate-300 inline-flex items-center gap-1.5">
                          Non-Aktif
                        </span>
                      )}
                    </td>
                    <td className="p-4 sm:p-5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(layanan)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayananToDelete(layanan)}
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                        title="Hapus Layanan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layanan Modal Add / Edit */}
      {isLayananModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingLayanan ? 'Edit Opsi Layanan' : 'Tambah Layanan Baru'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {editingLayanan ? 'Perbarui informasi opsi layanan' : 'Buat opsi unit layanan Kemenag baru'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLayananModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLayanan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Layanan *</label>
                <input
                  type="text"
                  value={layananName}
                  onChange={(e) => setLayananName(e.target.value)}
                  placeholder="Contoh: Seksi Pendidikan Agama dan Keagamaan Islam (PAKIS)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Keterangan / Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={layananDesc}
                  onChange={(e) => setLayananDesc(e.target.value)}
                  placeholder="Tuliskan deskripsi singkat tugas/fungsi unit layanan ini..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="layananActiveToggle"
                  checked={layananActive}
                  onChange={(e) => setLayananActive(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="layananActiveToggle" className="text-xs font-bold text-slate-800 cursor-pointer">
                  Aktifkan Layanan ini (Tampil di Form Pengaduan)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLayananModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingLayanan}
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingLayanan ? 'Menyimpan...' : 'Simpan Layanan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Layanan Modal */}
      {layananToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5">
            <div className="text-center space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Hapus Opsi Layanan?</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus opsi layanan{' '}
                <span className="font-extrabold text-slate-900">&quot;{layananToDelete.name}&quot;</span>? Opsi ini tidak
                akan tampil lagi pada formulir pengaduan publik.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLayananToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeletingLayanan}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isDeletingLayanan ? 'Menghapus...' : 'Ya, Hapus Layanan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
