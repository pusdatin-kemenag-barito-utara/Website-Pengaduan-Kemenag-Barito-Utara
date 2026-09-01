import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { getAppStatus, type Layanan, type AppStatusResult } from '../lib/api';
import {
  adminDeletePengaduan,
  adminListLayanan,
  adminListPengaduan,
  adminLogout,
  adminMe,
  adminStats,
  adminUpdatePengaduan,
} from '../lib/apiAdmin';
import type { AdminItem, AdminStats, AdminMe } from '../lib/apiAdmin';
import { analytics } from '../lib/analytics';
import AdminLogin from './admin/AdminLogin';
import AdminSidebar from './admin/AdminSidebar';
import AdminMobileHeader from './admin/AdminMobileHeader';
import ComplaintTable from './admin/ComplaintTable';
import ComplaintDetailModal from './admin/ComplaintDetailModal';
import DeleteComplaintModal from './admin/DeleteComplaintModal';
import LayananManagement from './admin/LayananManagement';
import StatsView from './admin/StatsView';
import RatingFeedbackView from './admin/RatingFeedbackView';
import TemplateManagement from './admin/TemplateManagement';
import ReportGeneratorView from './admin/ReportGeneratorView';
import SystemSettingsView from './admin/SystemSettingsView';
import type { Tab } from './admin/types';
import { ITEMS_PER_PAGE } from './admin/types';

export default function AdminPage() {
  // App Status from Pusdatin
  const [appStatus, setAppStatus] = useState<AppStatusResult | null>(null);

  // Auth State
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [, setAdminInfo] = useState<AdminMe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoginToast, setShowLoginToast] = useState<boolean>(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<Tab>('pengaduan');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Pengaduan List State
  const [list, setList] = useState<AdminItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [listError, setListError] = useState<string | null>(null);

  // Modals State
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AdminItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Layanan State
  const [layananList, setLayananList] = useState<Layanan[]>([]);
  const [isLayananLoading, setIsLayananLoading] = useState<boolean>(false);

  // Statistik State
  const [stats, setStats] = useState<AdminStats | null>(null);

  // ===== Data Fetching =====
  const fetchPengaduan = useCallback(
    async (page = currentPage, opts?: { search?: string; category?: string; status?: string }) => {
      setIsLoading(true);
      setListError(null);
      try {
        const res = await adminListPengaduan({
          page,
          per_page: ITEMS_PER_PAGE,
          search: opts?.search ?? searchTerm,
          category: opts?.category ?? filterCategory,
          status: opts?.status ?? filterStatus,
        });
        setList(res.items);
        setTotalItems(res.total);
        setCurrentPage(res.page);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat daftar pengaduan.';
        if (msg.toLowerCase().includes('sesi') || msg.toLowerCase().includes('unauthorized')) {
          setIsAuthenticated(false);
          setAdminInfo(null);
          setList([]);
          setStats(null);
          setLayananList([]);
          return;
        }
        setListError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPage, searchTerm, filterCategory, filterStatus],
  );

  const fetchLayanan = useCallback(async () => {
    setIsLayananLoading(true);
    try {
      setLayananList(await adminListLayanan());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('sesi') || msg.toLowerCase().includes('unauthorized')) {
        setIsAuthenticated(false);
        setAdminInfo(null);
        setList([]);
        setStats(null);
        setLayananList([]);
      }
    } finally {
      setIsLayananLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const s = await adminStats();
      setStats(s);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.toLowerCase().includes('sesi') || msg.toLowerCase().includes('unauthorized')) {
        setIsAuthenticated(false);
        setAdminInfo(null);
        setList([]);
        setStats(null);
        setLayananList([]);
      }
    }
  }, []);

  // ===== Auth Check on mount & Browser History Navigation (Back/Next) =====
  useEffect(() => {
    const checkAuth = () => {
      adminMe()
        .then((me: AdminMe | null) => {
          if (me) {
            setAdminInfo(me);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setAdminInfo(null);
            setList([]);
            setStats(null);
            setLayananList([]);
          }
        })
        .catch(() => {
          setIsAuthenticated(false);
          setAdminInfo(null);
          setList([]);
          setStats(null);
          setLayananList([]);
        })
        .finally(() => setIsAuthChecked(true));
    };

    checkAuth();
    getAppStatus()
      .then((st) => {
        setAppStatus(st);
        if (st.is_maintenance || st.status === 'maintenance') {
          window.location.replace('/maintenance');
        }
      })
      .catch(() => setAppStatus(null));

    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setAdminInfo(null);
      setList([]);
      setStats(null);
      setLayananList([]);
    };

    window.addEventListener('admin:unauthorized', handleUnauthorized);
    window.addEventListener('pageshow', checkAuth);
    window.addEventListener('popstate', checkAuth);
    window.addEventListener('focus', checkAuth);

    return () => {
      window.removeEventListener('admin:unauthorized', handleUnauthorized);
      window.removeEventListener('pageshow', checkAuth);
      window.removeEventListener('popstate', checkAuth);
      window.removeEventListener('focus', checkAuth);
    };
  }, []);

  // Auto-dismiss login toast after 5 seconds
  useEffect(() => {
    if (showLoginToast) {
      const timer = setTimeout(() => {
        setShowLoginToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showLoginToast]);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'pengaduan') {
        void fetchPengaduan(1);
        void fetchStats();
      } else if (activeTab === 'layanan') {
        void fetchLayanan();
      } else if (activeTab === 'statistik') {
        void fetchStats();
      }
    }
  }, [isAuthenticated, activeTab, fetchPengaduan, fetchLayanan, fetchStats]);

  const handleLogout = async () => {
    analytics.adminLogout();
    try {
      await adminLogout();
    } catch {
      /* abaikan */
    }
    setIsAuthenticated(false);
    setAdminInfo(null);
    setList([]);
    setLayananList([]);
    setStats(null);
  };

  // WhatsApp Notification
  const handleWhatsAppNotif = (item: AdminItem) => {
    const ticketUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?ticket=${item.ticket_number}`;
    const adminMsg = item.admin_response ? `\n\n*Tanggapan Resmi:*\n${item.admin_response}` : '';
    const message = [
      `*PEMBERITAHUAN SI-GESIT*`,
      `Kementerian Agama Kabupaten Barito Utara`,
      ``,
      `Yth. Pemohon / Pelapor,`,
      `Tiket *${item.ticket_number}* telah diperbarui statusnya menjadi *${item.status}*.`,
      adminMsg,
      ``,
      `Pantau progres tiket Anda: ${ticketUrl}`,
      ``,
      `_SI-GESIT - Tim Pengaduan Kemenag Barito Utara_`,
    ].join('\n');
    const phone = item.phone_number?.replace(/^0/, '62').replace(/\D/g, '');
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  const handleSaveUpdate = async (ticketNumber: string, status: string, adminResponse: string) => {
    await adminUpdatePengaduan(ticketNumber, { status, admin_response: adminResponse });
    setList((prev) =>
      prev.map((item) =>
        item.ticket_number === ticketNumber
          ? { ...item, status, admin_response: adminResponse }
          : item,
      ),
    );
    // Refresh stats in background to keep counters accurate
    void fetchStats();
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await adminDeletePengaduan(itemToDelete.ticket_number);
      setList((prev) => prev.filter((i) => i.ticket_number !== itemToDelete.ticket_number));
      setTotalItems((prev) => Math.max(0, prev - 1));
      setItemToDelete(null);
      // Refresh stats in background
      void fetchStats();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus tiket.');
    } finally {
      setIsDeleting(false);
    }
  };

  // ===== Loading Screen =====
  if (!isAuthChecked) {
    return (
      <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ===== Unauthenticated / Login View =====
  if (!isAuthenticated) {
    return (
      <AdminLogin
        onLoginSuccess={(me) => {
          setAdminInfo(me);
          setIsAuthenticated(true);
          setShowLoginToast(true);
        }}
      />
    );
  }

  // ===== Authenticated Admin Dashboard =====
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex font-sans relative">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        totalPengaduanCount={stats?.total ?? totalItems}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <AdminMobileHeader
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          onLogout={handleLogout}
        />

        {/* Pusdatin Maintenance Info Banner */}
        {appStatus?.is_maintenance && (
          <div className="mx-4 sm:mx-8 mt-4 sm:mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between gap-3 text-xs font-semibold shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span>
                <strong>Mode Pemeliharaan Pusdatin Aktif:</strong> Status aplikasi SI-GESIT saat ini sedang <em>MAINTENANCE</em> di Dashboard Pusdatin. Halaman publik masyarakat menampilkan informasi pemeliharaan, sementara Anda tetap dapat mengelola tiket dan data di panel admin ini.
              </span>
            </div>
          </div>
        )}

        <main className="p-4 sm:p-8 space-y-8 flex-1">
          {activeTab === 'pengaduan' && (
            <ComplaintTable
              list={list}
              totalItems={totalItems}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              isLoading={isLoading}
              listError={listError}
              stats={stats}
              onFetchPengaduan={fetchPengaduan}
              onOpenDetail={(item) => setSelectedItem(item)}
              onOpenDelete={(item) => setItemToDelete(item)}
              onWhatsAppNotif={handleWhatsAppNotif}
            />
          )}

          {activeTab === 'rating' && <RatingFeedbackView />}

          {activeTab === 'statistik' && (
            <StatsView stats={stats} onRefreshStats={fetchStats} />
          )}

          {activeTab === 'layanan' && (
            <LayananManagement
              layananList={layananList}
              setLayananList={setLayananList}
              isLayananLoading={isLayananLoading}
              onRefreshLayanan={fetchLayanan}
            />
          )}

          {activeTab === 'template' && <TemplateManagement />}

          {activeTab === 'laporan' && <ReportGeneratorView />}

          {activeTab === 'settings' && <SystemSettingsView />}
        </main>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <ComplaintDetailModal
          selectedItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSaveUpdate={handleSaveUpdate}
          onWhatsAppNotif={handleWhatsAppNotif}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteComplaintModal
        itemToDelete={itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirmDelete={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Toast Notifikasi Berhasil Login di Kanan Bawah */}
      {showLoginToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/95 to-emerald-950/80 text-white border border-emerald-500/40 backdrop-blur-xl shadow-2xl shadow-emerald-950/40 rounded-2xl p-4 flex items-start gap-3.5 max-w-sm">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 shadow-inner">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                Login Berhasil
              </p>
              <p className="text-xs text-slate-200 font-medium mt-0.5 leading-snug">
                Selamat datang kembali
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] text-emerald-400/90 font-medium">Sesi Aktif</span>
              </div>
            </div>
            <button
              onClick={() => setShowLoginToast(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}