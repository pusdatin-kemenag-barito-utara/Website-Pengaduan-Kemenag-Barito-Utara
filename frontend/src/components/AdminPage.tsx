import { useCallback, useEffect, useState } from 'react';
import type { Layanan } from '../lib/api';
import {
  adminDeletePengaduan, adminListLayanan, adminListPengaduan,
  adminLogout, adminMe, adminStats, adminUpdatePengaduan,
} from '../lib/apiAdmin';
import type { AdminItem, AdminStats, AdminMe } from '../lib/apiAdmin';
import AdminLogin from './admin/AdminLogin';
import AdminSidebar from './admin/AdminSidebar';
import AdminMobileHeader from './admin/AdminMobileHeader';
import ComplaintTable from './admin/ComplaintTable';
import ComplaintDetailModal from './admin/ComplaintDetailModal';
import DeleteComplaintModal from './admin/DeleteComplaintModal';
import LayananManagement from './admin/LayananManagement';
import StatsView from './admin/StatsView';
import type { Tab } from './admin/types';
import { ITEMS_PER_PAGE } from './admin/types';

export default function AdminPage() {
  // Auth State
  const [isAuthChecked, setIsAuthChecked] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [, setAdminInfo] = useState<AdminMe | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        setListError(err instanceof Error ? err.message : 'Gagal memuat daftar pengaduan.');
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
    } catch {
      /* biarkan list lama */
    } finally {
      setIsLayananLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const s = await adminStats();
      setStats(s);
    } catch {
      /* biarkan kosong */
    }
  }, []);

  // ===== Auth Check on mount =====
  useEffect(() => {
    adminMe()
      .then((me: AdminMe) => {
        setAdminInfo(me);
        setIsAuthenticated(true);
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsAuthChecked(true));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void fetchPengaduan(1);
      void fetchLayanan();
      void fetchStats();
    }
  }, [isAuthenticated, fetchPengaduan, fetchLayanan, fetchStats]);

  useEffect(() => {
    if (activeTab === 'statistik' && isAuthenticated) {
      void fetchStats();
    }
  }, [activeTab, isAuthenticated, fetchStats]);

  const handleLogout = async () => {
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
      `\u{1F3E2} *PEMBERITAHUAN SI-GESIT*`,
      `Kementerian Agama Kabupaten Barito Utara`,
      ``,
      `Yth. Pemohon / Pelapor,`,
      `Tiket *${item.ticket_number}* telah diperbarui statusnya menjadi *${item.status}*.`,
      adminMsg,
      ``,
      `Pantau progres tiket Anda: ${ticketUrl}`,
      ``,
      `_SI-GESIT \u2022 Tim Pengaduan Kemenag Barito Utara_`,
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
        }}
      />
    );
  }

  // ===== Authenticated Admin Dashboard =====
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex font-sans">
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

          {activeTab === 'layanan' && (
            <LayananManagement
              layananList={layananList}
              setLayananList={setLayananList}
              isLayananLoading={isLayananLoading}
              onRefreshLayanan={fetchLayanan}
            />
          )}

          {activeTab === 'statistik' && (
            <StatsView stats={stats} onRefreshStats={fetchStats} />
          )}
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
    </div>
  );
}