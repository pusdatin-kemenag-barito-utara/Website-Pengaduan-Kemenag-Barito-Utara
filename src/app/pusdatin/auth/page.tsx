'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  getAdminPengaduanListAction,
  updatePengaduanStatusAction,
  deletePengaduanAction,
  loginAdminPusdatinAction
} from './admin-actions';
import { Pengaduan } from '@/lib/supabase';
import {
  Lock,
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
  ChevronRight
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

export default function AdminAuthPage() {
  // Auth state with lazy initializer (Server-Safe & React 19 Compiler Compliant)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pusdatin_admin_session') === 'true';
    }
    return false;
  });
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Dashboard State
  const [list, setList] = useState<Pengaduan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal / Detail Selection
  const [selectedItem, setSelectedItem] = useState<Pengaduan | null>(null);
  const [newStatus, setNewStatus] = useState<Pengaduan['status']>('Menunggu');
  const [adminResponseText, setAdminResponseText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Confirmation Modal State
  const [itemToDelete, setItemToDelete] = useState<Pengaduan | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoading(true);

    const res = await loginAdminPusdatinAction(username, password, turnstileToken);
    setIsLoading(false);

    if (res.success) {
      localStorage.setItem('pusdatin_admin_session', 'true');
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoginError(res.message || 'Username atau password salah!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pusdatin_admin_session');
    setIsAuthenticated(false);
  };

  const fetchData = async () => {
    setIsLoading(true);
    const res = await getAdminPengaduanListAction();
    setIsLoading(false);
    if (res.success && res.data) {
      setList(res.data);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleOpenDetail = (item: Pengaduan) => {
    setSelectedItem(item);
    setNewStatus(item.status);
    setAdminResponseText(item.admin_response || '');
  };

  const handleSaveUpdate = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    const res = await updatePengaduanStatusAction(selectedItem.id || '', newStatus, adminResponseText);
    setIsSaving(false);

    if (res.success) {
      // Update local state list
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



  // Calculate Pagination
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedList = filteredList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
              className="object-contain mx-auto"
              priority
            />
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Panel Admin Pusdatin</h2>
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
                  className="absolute right-3.5 top-3 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  title={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Cloudflare Turnstile Widget (Clean Light Theme) */}
            <div className="flex justify-center my-3">
              <Turnstile
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
              {isLoading ? (
                <>Memeriksa Kredensial...</>
              ) : (
                <>
                  <Lock className="w-4 h-4" /> Masuk ke Panel Pusdatin
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-200">
            <Link href="/" className="text-xs text-slate-500 hover:text-emerald-600 transition-colors font-semibold">
              ← Kembali ke Halaman Utama SI-GESIT
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Header Admin - 100% Full Width */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 sm:px-12 py-4 flex items-center justify-between shadow-sm w-full">
        <div className="flex items-center gap-4">
          <Image
            src="/kemenag.svg"
            alt="Logo Kemenag"
            width={40}
            height={40}
            className="object-contain shrink-0"
            priority
          />
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900">Dashboard Admin Pusdatin</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold">Pengelolaan Pengaduan SI-GESIT (Super Admin Pusdatin)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs sm:text-sm font-bold flex items-center gap-2 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </header>

      {/* Main Admin Content - True 100% Full Width */}
      <main className="w-full px-6 sm:px-12 py-10 flex-1 space-y-8">
        {/* Top Summary Cards - Expanded Full Width */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm text-slate-500 font-bold">Total Pengaduan</p>
              <p className="text-3xl font-black text-slate-900 mt-2">{list.length}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <FileText className="w-7 h-7 text-emerald-600" />
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm text-slate-500 font-bold">Menunggu Respon</p>
              <p className="text-3xl font-black text-amber-600 mt-2">
                {list.filter((i) => i.status === 'Menunggu').length}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-500" />
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm text-slate-500 font-bold">Sedang Diproses</p>
              <p className="text-3xl font-black text-cyan-600 mt-2">
                {list.filter((i) => i.status === 'Diproses').length}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-cyan-500" />
            </div>
          </div>
          <div className="p-6 rounded-3xl bg-white border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="text-sm text-slate-500 font-bold">Selesai Ditindaklanjuti</p>
              <p className="text-3xl font-black text-emerald-600 mt-2">
                {list.filter((i) => i.status === 'Selesai').length}
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar - Full Width */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center w-full">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari tiket, nama, no HP, atau isi pengaduan..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 font-bold cursor-pointer"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Saran">Saran</option>
              <option value="Masukan">Masukan</option>
              <option value="Pengaduan">Pengaduan</option>
              <option value="Keluhan">Keluhan</option>
              <option value="Informasi">Informasi</option>
              <option value="Tanggapan">Tanggapan</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-600 font-bold cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Data Table - 100% Full Width */}
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm w-full flex flex-col">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-5">No Tiket</th>
                  <th className="p-5">Kategori</th>
                  <th className="p-5">Terkait Layanan</th>
                  <th className="p-5">Nama Pemohon</th>
                  <th className="p-5">No Handphone</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 font-medium">
                      Tidak ada data pengaduan yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-5 font-mono font-bold text-emerald-700">{item.ticket_number}</td>
                      <td className="p-5 font-extrabold text-slate-900">{item.category}</td>
                      <td className="p-5 text-slate-700 font-medium">{item.service_unit}</td>
                      <td className="p-5">
                        {item.is_anonymous ? (
                          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                            Anonim
                          </span>
                        ) : (
                          <span className="font-bold text-slate-800">{item.full_name}</span>
                        )}
                      </td>
                      <td className="p-5 text-slate-600 font-mono font-semibold">{item.phone_number}</td>
                      <td className="p-5">
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${
                            item.status === 'Selesai'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.status === 'Diproses'
                              ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                              : item.status === 'Ditolak'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenDetail(item)}
                            className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 transition-all font-bold cursor-pointer"
                          >
                            Tindaklanjuti
                          </button>
                          <button
                            onClick={() => setItemToDelete(item)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 transition-all cursor-pointer"
                            title="Hapus Tiket"
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

          {/* Pagination Controls - 10 Items Per Page */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600">
            <div>
              Menampilkan {filteredList.length === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredList.length)} dari {filteredList.length} total tiket
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>

              <span className="px-3 py-2 text-slate-800 font-extrabold">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Detail & Respon - Light Theme */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs text-slate-500 font-medium">Detail Pengaduan Tiket</span>
                <h3 className="font-mono text-xl font-extrabold text-emerald-700">{selectedItem.ticket_number}</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1 font-medium">Kategori</span>
                <span className="text-slate-900 font-bold text-sm">{selectedItem.category}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1 font-medium">Terkait Layanan</span>
                <span className="text-slate-900 font-bold text-sm">{selectedItem.service_unit}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1 font-medium">Nama Pemohon</span>
                <span className="text-slate-900 font-bold text-sm">
                  {selectedItem.is_anonymous ? 'Anonim (Disembunyikan)' : selectedItem.full_name || 'Tanpa Nama'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1 font-medium">Nomor Handphone</span>
                <span className="text-slate-900 font-bold text-sm font-mono">{selectedItem.phone_number}</span>
              </div>
            </div>

            {/* Lampiran File jika ada */}
            {selectedItem.file_url && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Lampiran Berkas Pendukung</span>
                <a
                  href={selectedItem.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  Lihat Berkas / Foto
                </a>
              </div>
            )}

            {/* Ulasan Rating dari Masyarakat jika ada */}
            {selectedItem.rating && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                <span className="text-xs font-bold text-amber-900 block">Rating & Ulasan dari Pengadu:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= (selectedItem.rating || 0) ? 'text-amber-500 font-bold' : 'text-slate-300'}>★</span>
                  ))}
                  <span className="text-xs font-extrabold text-amber-900 ml-1">{selectedItem.rating} / 5</span>
                </div>
                {selectedItem.user_feedback && (
                  <p className="text-xs text-slate-700 italic font-medium">&quot;{selectedItem.user_feedback}&quot;</p>
                )}
              </div>
            )}

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs text-slate-500 font-bold">Isi Pengaduan / Aspirasi:</span>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{selectedItem.content}</p>
            </div>

            {/* Form Update Status & Respon */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Ubah Status Pengaduan</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Menunggu', 'Diproses', 'Selesai', 'Ditolak'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        newStatus === st
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">Tanggapan / Respon Petugas Pusdatin</label>
                <textarea
                  rows={4}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="Tuliskan jawaban atau tindak lanjut resmi untuk pemohon..."
                  className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpdate}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Tanggapan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Data */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-slate-900">Hapus Tiket Pengaduan?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus tiket <span className="font-mono font-bold text-slate-900">{itemToDelete.ticket_number}</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md shadow-rose-600/30 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Tiket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
