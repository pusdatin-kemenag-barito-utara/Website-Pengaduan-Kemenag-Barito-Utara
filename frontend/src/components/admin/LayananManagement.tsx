import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  AlertCircle,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Layanan } from '../../lib/api';
import {
  adminCreateLayanan,
  adminDeleteLayanan,
  adminReorderLayanan,
  adminUpdateLayanan,
} from '../../lib/apiAdmin';

interface LayananManagementProps {
  layananList: Layanan[];
  setLayananList: Dispatch<SetStateAction<Layanan[]>>;
  isLayananLoading: boolean;
  onRefreshLayanan: () => Promise<void>;
}

type FilterStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function LayananManagement({
  layananList,
  setLayananList,
  isLayananLoading,
  onRefreshLayanan,
}: LayananManagementProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // Modal CRUD State
  const [isLayananModalOpen, setIsLayananModalOpen] = useState<boolean>(false);
  const [editingLayanan, setEditingLayanan] = useState<Layanan | null>(null);
  const [layananName, setLayananName] = useState<string>('');
  const [layananDesc, setLayananDesc] = useState<string>('');
  const [layananActive, setLayananActive] = useState<boolean>(true);
  const [isSavingLayanan, setIsSavingLayanan] = useState<boolean>(false);

  // Quick Toggle Status State (loading per ID)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Delete State
  const [layananToDelete, setLayananToDelete] = useState<Layanan | null>(null);
  const [isDeletingLayanan, setIsDeletingLayanan] = useState<boolean>(false);

  // Drag & Drop Reorder State
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const draggedIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);
  const [dragState, setDragState] = useState<{ from: number | null; over: number | null }>({
    from: null,
    over: null,
  });

  // Toast Notification State
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ type, message });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Broadcast sync event to public page/form
  const dispatchSync = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('layanan:updated'));
    }
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isLayananModalOpen) setIsLayananModalOpen(false);
        if (layananToDelete) setLayananToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLayananModalOpen, layananToDelete]);

  // Focus on name input when modal opens
  useEffect(() => {
    if (isLayananModalOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isLayananModalOpen]);

  // KPI Metrics Calculation
  const totalCount = layananList.length;
  const activeCount = useMemo(
    () => layananList.filter((l) => l.is_active !== false).length,
    [layananList],
  );
  const inactiveCount = totalCount - activeCount;

  // Filtered List based on Search & Status
  const filteredList = useMemo(() => {
    return layananList.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && item.is_active !== false) ||
        (statusFilter === 'INACTIVE' && item.is_active === false);

      return matchesSearch && matchesStatus;
    });
  }, [layananList, searchQuery, statusFilter]);

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'ALL';

  // Open Add Modal
  const handleOpenCreate = () => {
    setEditingLayanan(null);
    setLayananName('');
    setLayananDesc('');
    setLayananActive(true);
    setIsLayananModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (layanan: Layanan) => {
    setEditingLayanan(layanan);
    setLayananName(layanan.name);
    setLayananDesc(layanan.description || '');
    setLayananActive(layanan.is_active !== false);
    setIsLayananModalOpen(true);
  };

  // Save (Create / Update)
  const handleSaveLayanan = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    const cleanName = layananName.trim();
    if (!cleanName) {
      showToast('error', 'Nama unit layanan wajib diisi.');
      return;
    }
    if (cleanName.length > 150) {
      showToast('error', 'Nama unit layanan maksimal 150 karakter.');
      return;
    }

    setIsSavingLayanan(true);
    try {
      if (editingLayanan) {
        await adminUpdateLayanan(editingLayanan.id, {
          name: cleanName,
          description: layananDesc.trim() || null,
          is_active: layananActive,
        });
        showToast('success', `Unit layanan "${cleanName}" berhasil diperbarui.`);
      } else {
        await adminCreateLayanan({
          name: cleanName,
          description: layananDesc.trim() || undefined,
          is_active: layananActive,
        });
        showToast('success', `Unit layanan baru "${cleanName}" berhasil ditambahkan.`);
      }
      setIsLayananModalOpen(false);
      await onRefreshLayanan();
      dispatchSync();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan data layanan.');
    } finally {
      setIsSavingLayanan(false);
    }
  };

  // Delete Action
  const handleConfirmDelete = async () => {
    if (!layananToDelete) return;
    setIsDeletingLayanan(true);
    const deletedName = layananToDelete.name;
    try {
      await adminDeleteLayanan(layananToDelete.id);
      setLayananList((prev) => prev.filter((l) => l.id !== layananToDelete.id));
      setLayananToDelete(null);
      showToast('success', `Unit layanan "${deletedName}" berhasil dihapus.`);
      await onRefreshLayanan();
      dispatchSync();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menghapus layanan.');
    } finally {
      setIsDeletingLayanan(false);
    }
  };

  // 1-Click Quick Toggle Active Status
  const handleToggleStatus = async (layanan: Layanan) => {
    const nextStatus = layanan.is_active === false;
    setTogglingId(layanan.id);

    // Optimistic local update
    setLayananList((prev) =>
      prev.map((l) => (l.id === layanan.id ? { ...l, is_active: nextStatus } : l)),
    );

    try {
      await adminUpdateLayanan(layanan.id, { is_active: nextStatus });
      showToast(
        'success',
        `Status "${layanan.name}" diubah menjadi: ${nextStatus ? 'Aktif' : 'Non-Aktif'}.`,
      );
      dispatchSync();
    } catch (err) {
      // Revert if error
      setLayananList((prev) =>
        prev.map((l) => (l.id === layanan.id ? { ...l, is_active: !nextStatus } : l)),
      );
      showToast('error', `Gagal mengubah status: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setTogglingId(null);
    }
  };

  // Commit Reorder to Backend
  const commitReorder = async (next: Layanan[]) => {
    setLayananList(next);
    setIsReordering(true);
    try {
      await adminReorderLayanan(next.map((l) => l.id));
      showToast('success', 'Urutan posisi layanan berhasil diperbarui di sistem.');
      dispatchSync();
    } catch (err) {
      showToast(
        'error',
        `Gagal menyimpan urutan: ${err instanceof Error ? err.message : 'Kesalahan server'}`,
      );
      await onRefreshLayanan();
    } finally {
      setIsReordering(false);
    }
  };

  // 1-Click Move Up / Move Down
  const handleMove = (id: string, direction: 'up' | 'down') => {
    const fullIndex = layananList.findIndex((l) => l.id === id);
    if (fullIndex < 0) return;
    const targetIndex = direction === 'up' ? fullIndex - 1 : fullIndex + 1;
    if (targetIndex < 0 || targetIndex >= layananList.length) return;

    const next = [...layananList];
    const [movedItem] = next.splice(fullIndex, 1);
    next.splice(targetIndex, 0, movedItem);
    void commitReorder(next);
  };

  // Drag & Drop Handlers
  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    const fromId = draggedIndex.current !== null ? layananList[draggedIndex.current]?.id : null;
    draggedIndex.current = null;
    dragOverIndex.current = null;
    setDragState({ from: null, over: null });

    if (!fromId || fromId === dropTargetId) return;

    const fromIndex = layananList.findIndex((l) => l.id === fromId);
    const toIndex = layananList.findIndex((l) => l.id === dropTargetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...layananList];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    void commitReorder(next);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-lg transition-all animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-emerald-50/95 border-emerald-300 text-emerald-900 shadow-emerald-600/10'
              : toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-300 text-rose-900 shadow-rose-600/10'
                : 'bg-blue-50/95 border-blue-300 text-blue-900 shadow-blue-600/10'
          }`}
        >
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
            )}
            <span className="text-xs sm:text-sm font-black">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1.5 rounded-xl hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Kelola Terkait Layanan
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              100% Dinamis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
            Tambah, ubah, atur urutan posisi, atau aktifkan/nonaktifkan opsi layanan Kemenag secara
            dinamis dari database.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              void onRefreshLayanan();
              showToast('info', 'Daftar layanan diperbarui dari database.');
            }}
            disabled={isLayananLoading}
            className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-200 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
            title="Muat ulang data dari database"
          >
            <RotateCw className={`w-4 h-4 text-slate-600 ${isLayananLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Muat Ulang</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/25 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Layanan Baru
          </button>
        </div>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Unit Layanan</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Tersimpan di database</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Layanan Aktif</p>
            <p className="text-2xl font-black text-emerald-700 mt-0.5">{activeCount}</p>
            <p className="text-[11px] text-emerald-600 font-medium">Tampil di formulir publik</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Layanan Non-Aktif</p>
            <p className="text-2xl font-black text-slate-700 mt-0.5">{inactiveCount}</p>
            <p className="text-[11px] text-slate-500 font-medium">Disembunyikan dari publik</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <EyeOff className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau deskripsi unit layanan..."
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0 ${
              statusFilter === 'INACTIVE'
                ? 'bg-slate-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Non-Aktif ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Guide Note */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isFiltered
              ? 'Urutan posisi dapat diatur saat menampilkan semua layanan tanpa filter.'
              : 'Petunjuk: Tarik & geser ikon pegangan atau gunakan tombol panah (Naik / Turun) untuk mengatur urutan posisi layanan.'}
          </span>
        </div>
        {isReordering && (
          <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg animate-pulse shrink-0 flex items-center gap-1.5">
            <RotateCw className="w-3 h-3 animate-spin" /> Menyimpan urutan baru...
          </span>
        )}
      </div>

      {/* Table Section */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4 sm:p-5 w-24">Urutan</th>
                <th className="p-4 sm:p-5">Nama Unit Layanan</th>
                <th className="p-4 sm:p-5">Keterangan / Deskripsi</th>
                <th className="p-4 sm:p-5 text-center w-36">Status Layanan</th>
                <th className="p-4 sm:p-5 text-right w-28 whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {isLayananLoading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span>Memuat daftar opsi unit layanan dari database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    {isFiltered ? (
                      <div className="space-y-3">
                        <p>Tidak ada opsi layanan yang sesuai dengan filter atau kata kunci pencarian.</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reset Pencarian &amp; Filter
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p>Belum ada opsi layanan terdaftar di database.</p>
                        <p className="text-xs text-slate-400">
                          Klik tombol &quot;+ Tambah Layanan Baru&quot; di kanan atas untuk membuat layanan pertama.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredList.map((layanan, fIndex) => {
                  const actualIndex = layananList.findIndex((l) => l.id === layanan.id);
                  const isFirst = actualIndex === 0;
                  const isLast = actualIndex === layananList.length - 1;

                  return (
                    <tr
                      key={layanan.id}
                      draggable={!isFiltered}
                      onDragStart={() => {
                        if (isFiltered) return;
                        draggedIndex.current = actualIndex;
                        setDragState({ from: actualIndex, over: null });
                      }}
                      onDragOver={(e) => {
                        if (isFiltered) return;
                        e.preventDefault();
                        dragOverIndex.current = actualIndex;
                        setDragState((prev) => ({ ...prev, over: actualIndex }));
                      }}
                      onDrop={(e) => handleDrop(e, layanan.id)}
                      onDragEnd={() => {
                        draggedIndex.current = null;
                        dragOverIndex.current = null;
                        setDragState({ from: null, over: null });
                      }}
                      className={`transition-all duration-150 ${
                        dragState.from === actualIndex
                          ? 'opacity-30 bg-emerald-100/60 scale-[0.99]'
                          : dragState.over === actualIndex
                            ? 'border-2 border-dashed border-emerald-500 bg-emerald-50/80 shadow-md'
                            : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Urutan & Reorder Controls */}
                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 shrink-0 transition-colors ${
                              isFiltered
                                ? 'opacity-40 cursor-not-allowed'
                                : 'hover:bg-slate-200/80 cursor-grab active:cursor-grabbing'
                            }`}
                            title={
                              isFiltered
                                ? 'Reset filter untuk mengatur urutan'
                                : 'Tarik & geser untuk mengubah posisi'
                            }
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          <div className="flex flex-col items-center">
                            <span className="font-black text-slate-400 text-xs">
                              {actualIndex + 1}
                            </span>
                          </div>

                          {/* 1-Click Move Up / Down Buttons */}
                          <div className="flex flex-col gap-0.5 ml-1">
                            <button
                              type="button"
                              onClick={() => handleMove(layanan.id, 'up')}
                              disabled={isFirst || isReordering}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                              title="Pindahkan naik satu tingkat"
                              aria-label={`Pindahkan ${layanan.name} ke atas`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(layanan.id, 'down')}
                              disabled={isLast || isReordering}
                              className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-not-allowed transition-colors"
                              title="Pindahkan turun satu tingkat"
                              aria-label={`Pindahkan ${layanan.name} ke bawah`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Nama Layanan */}
                      <td className="p-4 sm:p-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-snug">{layanan.name}</p>
                            {layanan.order_index !== undefined && (
                              <p className="text-[10px] text-slate-400 font-semibold">
                                Indeks Urutan: {layanan.order_index}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="p-4 sm:p-5 text-slate-600 max-w-sm">
                        {layanan.description ? (
                          <span className="line-clamp-2">{layanan.description}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Belum ada keterangan</span>
                        )}
                      </td>

                      {/* Status Layanan dengan Quick Interactive Toggle */}
                      <td className="p-4 sm:p-5 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(layanan)}
                          disabled={togglingId === layanan.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60 ${
                            layanan.is_active !== false
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                          title={`Klik untuk mengubah status menjadi ${layanan.is_active !== false ? 'Non-Aktif' : 'Aktif'}`}
                          aria-label={`Ubah status ${layanan.name}`}
                        >
                          {togglingId === layanan.id ? (
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          ) : layanan.is_active !== false ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-slate-500" />
                          )}
                          <span>{layanan.is_active !== false ? 'Aktif' : 'Non-Aktif'}</span>
                        </button>
                      </td>

                      {/* Aksi Button (Ikon Saja & 1 Baris Sejajar) */}
                      <td className="p-4 sm:p-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(layanan)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs active:scale-95"
                            title="Edit Unit Layanan"
                            aria-label={`Edit layanan ${layanan.name}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setLayananToDelete(layanan)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200 transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs active:scale-95"
                            title="Hapus Unit Layanan"
                            aria-label={`Hapus layanan ${layanan.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layanan Modal Add / Edit */}
      {isLayananModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  {editingLayanan ? 'Edit Unit Layanan' : 'Tambah Unit Layanan Baru'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Perubahan akan langsung tersinkronisasi ke formulir pengaduan publik.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLayananModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                aria-label="Tutup jendela"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLayanan} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nama Unit Layanan <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {layananName.length} / 150
                  </span>
                </div>
                <input
                  ref={nameInputRef}
                  type="text"
                  maxLength={150}
                  value={layananName}
                  onChange={(e) => setLayananName(e.target.value)}
                  placeholder="Contoh: Seksi Bimbingan Masyarakat Islam (Bimas Islam)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-bold transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Keterangan / Deskripsi Singkat
                </label>
                <textarea
                  rows={3}
                  value={layananDesc}
                  onChange={(e) => setLayananDesc(e.target.value)}
                  placeholder="Tuliskan cakupan tugas atau informasi penting unit layanan ini..."
                  className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white font-medium transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <label
                    htmlFor="layananActiveToggle"
                    className="text-xs font-black text-slate-800 cursor-pointer block"
                  >
                    Status Layanan Aktif
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Jika aktif, layanan ini akan langsung muncul pada pilihan dropdown masyarakat.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="layananActiveToggle"
                  checked={layananActive}
                  onChange={(e) => setLayananActive(e.target.checked)}
                  className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                />
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
                  className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
                >
                  {isSavingLayanan && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingLayanan ? 'Menyimpan...' : 'Simpan Unit Layanan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Layanan Modal */}
      {layananToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5">
            <div className="text-center space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Hapus Opsi Layanan?</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus opsi layanan{' '}
                <span className="font-extrabold text-slate-900">&quot;{layananToDelete.name}&quot;</span>?
                Opsi ini tidak akan tampil lagi pada formulir pengaduan publik.
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold text-left">
                Catatan: Data pengaduan masyarakat terdahulu yang pernah memilih layanan ini akan tetap tersimpan secara aman.
              </div>
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
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-extrabold transition-all shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {isDeletingLayanan && <RotateCw className="w-4 h-4 animate-spin" />}
                <span>{isDeletingLayanan ? 'Menghapus...' : 'Ya, Hapus Layanan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
