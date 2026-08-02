'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  getAdminPengaduanListAction,
  updatePengaduanStatusAction,
  deletePengaduanAction,
  loginAdminPusdatinAction,
  getLayananListAction,
  createLayananAction,
  updateLayananAction,
  deleteLayananAction,
  reorderLayananAction,
} from './admin-actions';
import { Pengaduan, Layanan } from '@/lib/supabase';
import {
  User,
  LogOut,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit,
  X,
  Menu,
  Check,
  FolderKanban,
  Sliders,
  GripVertical,
  MessageCircle,
  BarChart3,
  FileSpreadsheet,
  FileDown,
  Star,
  TrendingUp,
} from 'lucide-react';

const emptySubscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

const getAdminSessionSnapshot = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('pusdatin_admin_session') === 'true';
};

const getServerSnapshot = () => false;

const subscribeAdminSession = (callback: () => void) => {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
};

const ITEMS_PER_PAGE = 10;

export default function AdminAuthPage() {
  const isMounted = useHasMounted();
  const [sessionAuth, setSessionAuth] = useState<boolean>(false);
  const externalAuth = useSyncExternalStore(subscribeAdminSession, getAdminSessionSnapshot, getServerSnapshot);
  const isAuthenticated = sessionAuth || externalAuth;

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [turnstileKey, setTurnstileKey] = useState<number>(0);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Sidebar & Navigation State
  const [activeTab, setActiveTab] = useState<'pengaduan' | 'layanan' | 'statistik'>('pengaduan');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Admin Dashboard Pengaduan State
  const [list, setList] = useState<Pengaduan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal / Detail Selection Pengaduan
  const [selectedItem, setSelectedItem] = useState<Pengaduan | null>(null);
  const [newStatus, setNewStatus] = useState<Pengaduan['status']>('Menunggu');
  const [adminResponseText, setAdminResponseText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Confirmation Modal State Pengaduan
  const [itemToDelete, setItemToDelete] = useState<Pengaduan | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Dynamic Layanan CRUD State
  const [layananList, setLayananList] = useState<Layanan[]>([]);
  const [isLayananLoading, setIsLayananLoading] = useState<boolean>(false);
  const [isLayananModalOpen, setIsLayananModalOpen] = useState<boolean>(false);
  const [editingLayanan, setEditingLayanan] = useState<Layanan | null>(null);
  const [layananName, setLayananName] = useState<string>('');
  const [layananDesc, setLayananDesc] = useState<string>('');
  const [layananActive, setLayananActive] = useState<boolean>(true);
  const [isSavingLayanan, setIsSavingLayanan] = useState<boolean>(false);

  // === WhatsApp Notification Handler ===
  const handleWhatsAppNotif = (item: Pengaduan) => {
    const ticketUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?ticket=${item.ticket_number}`;
    const adminMsg = item.admin_response ? `\n\n*Tanggapan:*\n${item.admin_response}` : '';
    const message = [
      `🏢 *PEMBERITAHUAN SI-GESIT*`,
      `Kemenag Kabupaten Barito Utara`,
      ``,
      `Yth. Pemohon / Pelapor,`,
      `Tiket *${item.ticket_number}* telah diperbarui statusnya menjadi *${item.status}*.`,
      adminMsg,
      ``,
      `Cek status: ${ticketUrl}`,
      ``,
      `_SI-GESIT • Kemenag Barito Utara_`,
    ].join('\n');

    const phone = item.phone_number?.replace(/^0/, '62').replace(/\D/g, '');
    const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // === Export Excel Handler ===
  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = list.map((item, i) => ({
      'No': i + 1,
      'No Tiket': item.ticket_number,
      'Kategori': item.category,
      'Unit Layanan': item.service_unit,
      'Nama Pemohon': item.is_anonymous ? 'Anonim' : (item.full_name || '-'),
      'No HP / WA': item.phone_number,
      'Status': item.status,
      'Tanggal Dibuat': item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-',
      'Tanggapan Admin': item.admin_response || '-',
      'Rating': item.rating ? `${item.rating}/5` : '-',
      'Ulasan Pemohon': item.user_feedback || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengaduan SI-GESIT');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Laporan_Pengaduan_SIGESIT_${dateStr}.xlsx`);
  };

  // === Export PDF Handler ===
  const handleExportPDF = async () => {
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = autoTableModule.default;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const dateStr = new Date().toLocaleDateString('id-ID', { dateStyle: 'full' });

    doc.setFillColor(6, 78, 59);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN REKAPITULASI PENGADUAN & ASPIRASI SI-GESIT', 14, 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Kementerian Agama Kabupaten Barito Utara  •  Dicetak: ${dateStr}  •  Total: ${list.length} tiket`, 14, 17);

    autoTable(doc, {
      startY: 26,
      head: [['No', 'No Tiket', 'Kategori', 'Unit Layanan', 'Nama Pemohon', 'No HP', 'Status', 'Tgl Dibuat', 'Rating']],
      body: list.map((item, i) => [
        i + 1,
        item.ticket_number,
        item.category,
        item.service_unit.length > 30 ? item.service_unit.slice(0, 28) + '…' : item.service_unit,
        item.is_anonymous ? 'Anonim' : (item.full_name || '-'),
        item.phone_number,
        item.status,
        item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '-',
        item.rating ? `${item.rating}★` : '-',
      ]),
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [6, 78, 59], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 250, 247] },
      columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 6: { halign: 'center' }, 8: { halign: 'center' } },
    });

    const dateFile = new Date().toISOString().slice(0, 10);
    doc.save(`Laporan_Pengaduan_SIGESIT_${dateFile}.pdf`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    const res = await loginAdminPusdatinAction(username, password, turnstileToken);
    setIsLoading(false);

    if (res.success) {
      localStorage.setItem('pusdatin_admin_session', 'true');
      setSessionAuth(true);
      fetchData();
      fetchLayananData();
    } else {
      setLoginError(res.message || 'Username atau password salah!');
      setTurnstileToken('');
      setTurnstileKey((prev) => prev + 1);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pusdatin_admin_session');
    setSessionAuth(false);
  };

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getAdminPengaduanListAction();
    setIsLoading(false);
    if (res.success && res.data) {
      setList(res.data);
    }
  };

  const fetchLayananData = async () => {
    setIsLayananLoading(true);
    const res = await getLayananListAction();
    setIsLayananLoading(false);
    if (res.success && res.data) {
      setLayananList(res.data);
    }
  };

  useEffect(() => {
    if (isMounted && isAuthenticated) {
      fetchData();
      fetchLayananData();
    }
  }, [isAuthenticated, isMounted, activeTab]);

  // Kunci scroll background saat modal aktif
  useEffect(() => {
    const anyModalOpen = !!selectedItem || !!itemToDelete || isLayananModalOpen;
    if (anyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [selectedItem, itemToDelete, isLayananModalOpen]);

  const handleOpenDetail = async (item: Pengaduan) => {
    // Set awal dari data list yang ada
    setSelectedItem(item);
    setNewStatus(item.status);
    setAdminResponseText(item.admin_response || '');

    // Re-fetch data terbaru dari DB agar rating & ulasan pemohon selalu up-to-date
    try {
      const res = await getAdminPengaduanListAction();
      if (res.success && res.data) {
        const freshItem = (res.data as Pengaduan[]).find((d) => d.id === item.id);
        if (freshItem) {
          setSelectedItem(freshItem);
          setNewStatus(freshItem.status);
          setAdminResponseText(freshItem.admin_response || '');
          setList(res.data as Pengaduan[]);
        }
      }
    } catch {
      // Biarkan data awal tetap dipakai jika fetch gagal
    }
  };

  const handleSaveUpdate = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    const res = await updatePengaduanStatusAction(selectedItem.id || '', newStatus, adminResponseText);
    setIsSaving(false);

    if (res.success) {
      setList((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, status: newStatus, admin_response: adminResponseText }
            : item
        )
      );
      setSelectedItem(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const res = await deletePengaduanAction(itemToDelete.id || '');
    setIsDeleting(false);

    if (res.success) {
      setList((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setItemToDelete(null);
    } else {
      alert(res.message || 'Gagal menghapus tiket.');
    }
  };

  // Layanan Handlers
  const handleOpenCreateLayanan = () => {
    setEditingLayanan(null);
    setLayananName('');
    setLayananDesc('');
    setLayananActive(true);
    setIsLayananModalOpen(true);
  };

  const handleOpenEditLayanan = (item: Layanan) => {
    setEditingLayanan(item);
    setLayananName(item.name);
    setLayananDesc(item.description || '');
    setLayananActive(item.is_active !== false);
    setIsLayananModalOpen(true);
  };

  const handleSaveLayanan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!layananName.trim()) return;

    setIsSavingLayanan(true);
    let res;
    if (editingLayanan?.id) {
      res = await updateLayananAction(editingLayanan.id, layananName, layananDesc, layananActive);
    } else {
      res = await createLayananAction(layananName, layananDesc);
    }
    setIsSavingLayanan(false);

    if (res.success) {
      setIsLayananModalOpen(false);
      fetchLayananData();
    } else {
      alert(res.message || 'Gagal menyimpan data layanan.');
    }
  };

  // Delete Confirmation Modal State Layanan
  const [layananToDelete, setLayananToDelete] = useState<Layanan | null>(null);
  const [isDeletingLayanan, setIsDeletingLayanan] = useState<boolean>(false);

  const handleConfirmDeleteLayanan = async () => {
    if (!layananToDelete?.id) return;
    setIsDeletingLayanan(true);
    const res = await deleteLayananAction(layananToDelete.id);
    setIsDeletingLayanan(false);

    if (res.success) {
      setLayananToDelete(null);
      fetchLayananData();
    } else {
      alert(res.message || 'Gagal menghapus data layanan.');
    }
  };

  // Drag & Drop Reordering State for Layanan
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [reorderSuccessMsg, setReorderSuccessMsg] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTableRowElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newList = [...layananList];
    const [movedItem] = newList.splice(draggedIndex, 1);
    newList.splice(dropIndex, 0, movedItem);

    // Optimistic UI Update
    setLayananList(newList);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save order_index to database back-end
    const payload = newList.map((item, idx) => ({
      id: item.id || '',
      order_index: idx + 1,
    }));

    setIsReordering(true);
    const res = await reorderLayananAction(payload);
    setIsReordering(false);

    if (res.success) {
      setReorderSuccessMsg('Urutan posisi layanan berhasil disimpan!');
      setTimeout(() => setReorderSuccessMsg(null), 3000);
    } else {
      fetchLayananData();
    }
  };

  const filteredList = list.filter((item) => {
    const matchSearch =
      item.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.full_name && item.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.phone_number.includes(searchTerm) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;

    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedList = filteredList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!isMounted) {
    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-100 text-slate-800 flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <Image
              src="/kemenag.svg"
              alt="Logo Kemenag"
              width={56}
              height={56}
              className="object-contain mx-auto h-auto"
              priority
            />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Panel Admin TIM Pengaduan</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">SI-GESIT (Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan)</p>
          </div>

          {loginError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email / Username</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="baritoutara@kemenag.go.id"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 font-medium"
                  required
                />
                <User className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full pl-4 pr-12 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-center my-3">
              <Turnstile
                key={turnstileKey}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADR1O_LSp1lgc3km'}
                onSuccess={(token) => setTurnstileToken(token)}
                options={{ theme: 'light' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Memeriksa Kredensial...' : 'Masuk ke Panel TIM Pengaduan'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex font-sans">
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-72 bg-slate-900 text-slate-200 flex flex-col justify-between p-5 shadow-2xl transition-all duration-300 shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-800 pb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-2xl bg-emerald-950 border border-emerald-800/60 shrink-0">
                <Image
                  src="/kemenag.svg"
                  alt="Logo Kemenag"
                  width={34}
                  height={34}
                  className="object-contain h-auto"
                  priority
                />
              </div>
              <div className="min-w-0">
                <h1 className="font-black text-lg text-white tracking-tight truncate">SI-GESIT Admin</h1>
                <p className="text-[11px] text-emerald-400 font-bold tracking-wide uppercase">TIM Pengaduan Kemenag Barito Utara</p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-2">
            <button
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
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300">
                {list.length}
              </span>
            </button>

            <button
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
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-emerald-400">
                Dinamis
              </span>
            </button>

            <button
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
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-violet-400">
                Grafik
              </span>
            </button>
          </nav>
        </div>

        <div className="space-y-3 border-t border-slate-800 pt-4">
          <button
            onClick={() => {
              fetchData();
              fetchLayananData();
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isLayananLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-black text-base text-slate-900">SI-GESIT Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
            title="Keluar"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="p-4 sm:p-8 space-y-8 flex-1">
          {activeTab === 'pengaduan' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Kelola Pengaduan & Aspirasi</h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Pantau, perbarui status, dan kirim tanggapan resmi ke pelapor.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={fetchData}
                    className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                    title="Download Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                    title="Download PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="p-5 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Total Pengaduan</p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{list.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Menunggu Respon</p>
                    <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                      {list.filter((i) => i.status === 'Menunggu').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-500" />
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Sedang Diproses</p>
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">
                      {list.filter((i) => i.status === 'Diproses').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                </div>

                <div className="p-5 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Selesai Ditindaklanjuti</p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                      {list.filter((i) => i.status === 'Selesai').length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari tiket, nama, no HP, isi pengaduan..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-medium"
                  />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select
                    value={filterCategory}
                    onChange={(e) => {
                      setFilterCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <option value="Saran">Saran</option>
                    <option value="Masukan">Masukan</option>
                    <option value="Pengaduan">Pengaduan</option>
                    <option value="Keluhan">Keluhan</option>
                    <option value="Informasi">Informasi</option>
                    <option value="Tanggapan">Tanggapan</option>
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Menunggu">Menunggu</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-4 sm:p-5">No Tiket</th>
                        <th className="p-4 sm:p-5">Kategori</th>
                        <th className="p-4 sm:p-5">Terkait Layanan</th>
                        <th className="p-4 sm:p-5">Nama Pemohon</th>
                        <th className="p-4 sm:p-5">No Handphone</th>
                        <th className="p-4 sm:p-5">Status</th>
                        <th className="p-4 sm:p-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                            Memuat data pengaduan...
                          </td>
                        </tr>
                      ) : paginatedList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                            Tidak ada data pengaduan yang ditemukan.
                          </td>
                        </tr>
                      ) : (
                        paginatedList.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4 sm:p-5 font-mono font-bold text-emerald-800">{item.ticket_number}</td>
                            <td className="p-4 sm:p-5">
                              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-extrabold border border-slate-200">
                                {item.category}
                              </span>
                            </td>
                            <td className="p-4 sm:p-5 font-semibold text-slate-800 max-w-[200px] truncate">
                              {item.service_unit}
                            </td>
                            <td className="p-4 sm:p-5 font-bold text-slate-900">
                              {item.is_anonymous ? (
                                <span className="text-slate-400 italic">Anonim</span>
                              ) : (
                                item.full_name || '-'
                              )}
                            </td>
                            <td className="p-4 sm:p-5 font-mono text-slate-600">{item.phone_number}</td>
                            <td className="p-4 sm:p-5">
                              <span
                                className={`px-3 py-1 rounded-full text-[11px] font-extrabold border inline-flex items-center gap-1.5 ${
                                  item.status === 'Selesai'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : item.status === 'Diproses'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : item.status === 'Ditolak'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="p-4 sm:p-5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenDetail(item)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
                                >
                                  Detail / Respon
                                </button>
                                <button
                                  onClick={() => handleWhatsAppNotif(item)}
                                  className="p-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-colors cursor-pointer"
                                  title="Kirim Notifikasi WhatsApp ke Pemohon"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setItemToDelete(item)}
                                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                                  title="Hapus Pengaduan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600">
                  <p>
                    Menampilkan {filteredList.length > 0 ? startIndex + 1 : 0} -{' '}
                    {Math.min(startIndex + ITEMS_PER_PAGE, filteredList.length)} dari {filteredList.length} total tiket
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((prev) => prev - 1)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Prev
                    </button>
                    <span>
                      Halaman {currentPage} dari {totalPages}
                    </span>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((prev) => prev + 1)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistik' && (() => {
            const categoryKeys = ['Saran', 'Masukan', 'Pengaduan', 'Keluhan', 'Informasi', 'Tanggapan'];
            const statusKeys = ['Menunggu', 'Diproses', 'Selesai', 'Ditolak'];
            const categoryColors: Record<string, string> = { Saran: '#059669', Masukan: '#0284c7', Pengaduan: '#dc2626', Keluhan: '#d97706', Informasi: '#7c3aed', Tanggapan: '#0891b2' };
            const statusColors: Record<string, string> = { Menunggu: '#d97706', Diproses: '#2563eb', Selesai: '#059669', Ditolak: '#dc2626' };
            const categoryCounts = categoryKeys.map(k => ({ label: k, count: list.filter(i => i.category === k).length }));
            const statusCounts = statusKeys.map(k => ({ label: k, count: list.filter(i => i.status === k).length }));
            const maxCat = Math.max(...categoryCounts.map(c => c.count), 1);
            const ratedItems = list.filter(i => i.rating && i.rating > 0);
            const avgRating = ratedItems.length > 0 ? (ratedItems.reduce((s, i) => s + (i.rating || 0), 0) / ratedItems.length).toFixed(1) : '-';
            const monthMap: Record<string, number> = {};
            list.forEach(item => {
              if (item.created_at) {
                const key = new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
                monthMap[key] = (monthMap[key] || 0) + 1;
              }
            });
            const monthEntries = Object.entries(monthMap).slice(-6);
            const maxMonth = Math.max(...monthEntries.map(([, v]) => v), 1);
            const totalDonut = statusCounts.reduce((s, c) => s + c.count, 0) || 1;
            let donutOffset = 0;

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Statistik Pengaduan</h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">Ringkasan analitik data pengaduan & aspirasi SI-GESIT secara real-time.</p>
                  </div>
                  <button onClick={fetchData} className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Perbarui Data
                  </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[{ label: 'Total Tiket', val: list.length, color: 'emerald', icon: <FileText className="w-5 h-5" /> },
                    { label: 'Menunggu', val: list.filter(i => i.status === 'Menunggu').length, color: 'amber', icon: <Clock className="w-5 h-5" /> },
                    { label: 'Diproses', val: list.filter(i => i.status === 'Diproses').length, color: 'blue', icon: <RefreshCw className="w-5 h-5" /> },
                    { label: 'Selesai', val: list.filter(i => i.status === 'Selesai').length, color: 'green', icon: <CheckCircle className="w-5 h-5" /> },
                    { label: 'Ditolak', val: list.filter(i => i.status === 'Ditolak').length, color: 'rose', icon: <AlertCircle className="w-5 h-5" /> },
                  ].map(card => (
                    <div key={card.label} className="bg-white rounded-3xl border border-slate-200 p-5 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[11px] text-slate-500 font-bold">{card.label}</p>
                        <p className={`text-3xl font-black mt-0.5 text-${card.color === 'green' ? 'emerald' : card.color}-600`}>{card.val}</p>
                      </div>
                      <div className={`w-11 h-11 rounded-2xl bg-${card.color === 'green' ? 'emerald' : card.color}-50 border border-${card.color === 'green' ? 'emerald' : card.color}-100 flex items-center justify-center text-${card.color === 'green' ? 'emerald' : card.color}-600`}>
                        {card.icon}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Bar Chart Kategori */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <BarChart3 className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-black text-slate-900 text-sm">Pengaduan per Kategori</h3>
                    </div>
                    <div className="space-y-3">
                      {categoryCounts.map(({ label, count }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>{label}</span><span>{count}</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-3 rounded-full transition-all duration-700"
                              style={{ width: `${(count / maxCat) * 100}%`, backgroundColor: categoryColors[label] }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Donut Status */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                      <h3 className="font-black text-slate-900 text-sm">Distribusi Status</h3>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <svg viewBox="0 0 100 100" className="w-36 h-36" style={{ transform: 'rotate(-90deg)' }}>
                        {statusCounts.map(({ label, count }) => {
                          const pct = (count / totalDonut) * 100;
                          const dash = `${pct} ${100 - pct}`;
                          const el = (
                            <circle key={label} cx="50" cy="50" r="15.915"
                              fill="none" strokeWidth="10"
                              stroke={statusColors[label]}
                              strokeDasharray={dash}
                              strokeDashoffset={-donutOffset}
                            />
                          );
                          donutOffset += pct;
                          return el;
                        })}
                        <circle cx="50" cy="50" r="10" fill="white" />
                      </svg>
                      <div className="space-y-1.5 w-full">
                        {statusCounts.map(({ label, count }) => (
                          <div key={label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: statusColors[label] }} />
                              <span className="font-semibold text-slate-700">{label}</span>
                            </div>
                            <span className="font-black text-slate-900">{count} <span className="text-slate-400 font-normal">({totalDonut > 0 ? ((count/totalDonut)*100).toFixed(0) : 0}%)</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tren per Bulan */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <h3 className="font-black text-slate-900 text-sm">Tren 6 Bulan Terakhir</h3>
                    </div>
                    {monthEntries.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-8">Belum ada data bulan</p>
                    ) : (
                      <div className="flex items-end gap-2 h-32">
                        {monthEntries.map(([month, count]) => (
                          <div key={month} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-black text-emerald-700">{count}</span>
                            <div
                              className="w-full rounded-t-lg bg-emerald-500 transition-all duration-700"
                              style={{ height: `${(count / maxMonth) * 100}%`, minHeight: 4 }}
                            />
                            <span className="text-[9px] text-slate-500 font-bold text-center leading-tight">{month}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Rating Summary */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <Star className="w-4 h-4 text-amber-500" />
                      <h3 className="font-black text-slate-900 text-sm">Penilaian Layanan</h3>
                    </div>
                    <div className="flex items-center gap-6 mb-5">
                      <div className="text-center">
                        <p className="text-5xl font-black text-amber-500">{avgRating}</p>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">Rata-rata Rating</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map(star => {
                          const cnt = ratedItems.filter(i => i.rating === star).length;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs">
                              <span className="text-amber-500 font-bold w-4">{star}★</span>
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-2 bg-amber-400 rounded-full" style={{ width: ratedItems.length ? `${(cnt/ratedItems.length)*100}%` : '0%' }} />
                              </div>
                              <span className="text-slate-500 w-4 text-right">{cnt}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-lg font-black text-slate-900">{ratedItems.length}</p>
                        <p className="text-[11px] text-slate-500 font-bold">Sudah Menilai</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-slate-400">{list.length - ratedItems.length}</p>
                        <p className="text-[11px] text-slate-500 font-bold">Belum Menilai</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {activeTab === 'layanan' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Kelola Terkait Layanan</h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Tambah, ubah, atur urutan posisi, atau hapus opsi layanan Kemenag secara dinamis.</p>
                </div>
                <button
                  onClick={handleOpenCreateLayanan}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" /> Tambah Layanan Baru
                </button>
              </div>

              {reorderSuccessMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2 shadow-xs animate-in fade-in-50 duration-200">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reorderSuccessMsg}</span>
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
                            key={layanan.id || index}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={() => {
                              setDraggedIndex(null);
                              setDragOverIndex(null);
                            }}
                            className={`transition-all duration-150 ${
                              draggedIndex === index
                                ? 'opacity-30 bg-emerald-100/60 scale-[0.99]'
                                : dragOverIndex === index
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
                                <span className="font-mono font-extrabold text-slate-400">{index + 1}</span>
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
                                onClick={() => handleOpenEditLayanan(layanan)}
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Edit className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
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
            </div>
          )}
        </main>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-[85vw] bg-white rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">

            {/* Header Strip */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Detail &amp; Tanggapan Pengaduan</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">Tiket #{selectedItem.ticket_number}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Status Badge */}
                <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border ${
                  selectedItem.status === 'Selesai' ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700' :
                  selectedItem.status === 'Diproses' ? 'bg-cyan-900/60 text-cyan-300 border-cyan-700' :
                  selectedItem.status === 'Ditolak' ? 'bg-rose-900/60 text-rose-300 border-rose-700' :
                  'bg-amber-900/60 text-amber-300 border-amber-700'
                }`}>
                  {selectedItem.status}
                </span>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Two-column Body */}
            <div className="grid grid-cols-1 lg:grid-cols-5 flex-1 min-h-0 overflow-hidden">

              {/* LEFT — Ticket Info (2 cols) */}
              <div className="lg:col-span-2 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/50 overflow-y-auto flex flex-col gap-5">

                {/* Meta Grid */}
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Informasi Pengadu</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Kategori</p>
                      <p className="text-sm font-black text-slate-900">{selectedItem.category}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Tgl Dibuat</p>
                      <p className="text-xs font-bold text-slate-900">
                        {selectedItem.created_at
                          ? new Date(selectedItem.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                          : '-'}
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Nama Pemohon</p>
                      <p className="text-sm font-black text-slate-900">{selectedItem.is_anonymous ? 'Anonim' : selectedItem.full_name || '-'}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">No HP / WA</p>
                      <p className="text-sm font-black text-slate-900 font-mono">{selectedItem.phone_number}</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3 col-span-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Unit Layanan Terkait</p>
                      <p className="text-sm font-bold text-slate-900">{selectedItem.service_unit}</p>
                    </div>
                  </div>
                </div>

                {/* Rating Info if exists */}
                {selectedItem.rating && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-[10px] text-amber-600 font-black uppercase tracking-wider mb-1">Penilaian dari Pengadu</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl font-black text-amber-600">{'★'.repeat(selectedItem.rating)}{'☆'.repeat(5 - selectedItem.rating)}</span>
                      <span className="text-xs font-bold text-amber-700">({selectedItem.rating}/5)</span>
                    </div>
                    {selectedItem.user_feedback && (
                      <p className="text-xs text-amber-900 mt-1.5 font-medium italic">&ldquo;{selectedItem.user_feedback}&rdquo;</p>
                    )}
                  </div>
                )}

                {/* Lampiran */}
                {selectedItem.file_url && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Lampiran Berkas</span>
                    </div>
                    <a
                      href={selectedItem.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" /> Lihat Lampiran
                    </a>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 mt-auto pt-2 flex-wrap">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleWhatsAppNotif(selectedItem)}
                    className="px-4 py-2.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Kirim notifikasi WhatsApp ke pemohon"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> WA
                  </button>
                  <button
                    disabled={isSaving}
                    onClick={handleSaveUpdate}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isSaving ? 'Menyimpan...' : 'Simpan Tanggapan'}
                  </button>
                </div>
              </div>

              {/* RIGHT — Content & Response (3 cols) */}
              <div className="lg:col-span-3 p-6 sm:p-8 overflow-y-auto flex flex-col gap-5">

                {/* Isi Pengaduan */}
                <div>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Isi Pengaduan / Aspirasi</p>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap font-medium leading-relaxed text-sm max-h-56 overflow-y-auto">
                    {selectedItem.content}
                  </div>
                </div>

                {/* Tanggapan lama jika ada */}
                {selectedItem.admin_response && (
                  <div>
                    <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Tanggapan Sebelumnya
                    </p>
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                      {selectedItem.admin_response}
                    </div>
                  </div>
                )}

                {/* Perbarui Status */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">Perbarui Status Pengaduan</p>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Pengaduan['status'])}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 cursor-pointer transition-all"
                  >
                    <option value="Menunggu">⏳ Menunggu</option>
                    <option value="Diproses">🔄 Diproses</option>
                    <option value="Selesai">✅ Selesai</option>
                    <option value="Ditolak">❌ Ditolak</option>
                  </select>
                </div>

                {/* Tulis Tanggapan */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">
                    Tanggapan Respon Resmi TIM Pengaduan
                  </label>
                  <textarea
                    rows={5}
                    value={adminResponseText}
                    onChange={(e) => setAdminResponseText(e.target.value)}
                    placeholder="Tuliskan jawaban respon atau penjelasan perihal penanganan pengaduan ini..."
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-medium transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Hapus Tiket Pengaduan?</h3>
              <p className="text-xs text-slate-500 font-medium">
                Apakah Anda yakin ingin menghapus tiket <span className="font-mono font-bold text-slate-900">#{itemToDelete.ticket_number}</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Tiket'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={() => setIsLayananModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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

      {/* MODAL 4: KONFIRMASI HAPUS LAYANAN (CUSTOM ALERT DIALOG) */}
      {layananToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="text-center space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-sm">
                <Trash2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Hapus Opsi Layanan?</h3>
              <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus opsi layanan <span className="font-extrabold text-slate-900">&quot;{layananToDelete.name}&quot;</span>? Opsi ini tidak akan tampil lagi pada formulir pengaduan publik.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setLayananToDelete(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-extrabold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={isDeletingLayanan}
                onClick={handleConfirmDeleteLayanan}
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
