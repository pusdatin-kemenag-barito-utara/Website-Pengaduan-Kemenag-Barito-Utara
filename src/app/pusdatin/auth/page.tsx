'use client';

import React, { useState, useEffect } from 'react';
import { getAdminPengaduanListAction, updatePengaduanStatusAction } from './admin-actions';
import { Pengaduan } from '@/lib/supabase';
import {
  Lock,
  User,
  KeyRound,
  LogOut,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  MessageSquare,
  Building2,
  FileText,
  UserCheck,
  UserX,
  Phone,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export default function AdminAuthPage() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Dashboard State
  const [list, setList] = useState<Pengaduan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal / Detail Selection
  const [selectedItem, setSelectedItem] = useState<Pengaduan | null>(null);
  const [newStatus, setNewStatus] = useState<Pengaduan['status']>('Menunggu');
  const [adminResponseText, setAdminResponseText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    // Simple default login verification for Pusdatin admin
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoginError('Username atau password salah! (Default: admin / admin123)');
    }
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-emerald-950">
              SG
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Panel Admin Pusdatin</h2>
            <p className="text-xs text-slate-400">SI-GESIT (Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan)</p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Username Admin</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
                <User className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500"
                  required
                />
                <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" /> Masuk ke Panel Pusdatin
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <a href="/" className="text-xs text-slate-400 hover:text-emerald-400 transition-colors">
              ← Kembali ke Halaman Utama SI-GESIT
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Admin */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-lg">
            SG
          </div>
          <div>
            <h1 className="font-bold text-base text-white">Dashboard Admin Pusdatin</h1>
            <p className="text-xs text-slate-400">Pengelolaan Pengaduan SI-GESIT Kemenag</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAuthenticated(false)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-rose-500/30"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Total Pengaduan</p>
              <p className="text-2xl font-bold text-white mt-1">{list.length}</p>
            </div>
            <FileText className="w-8 h-8 text-emerald-400 opacity-80" />
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Menunggu Respon</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">
                {list.filter((i) => i.status === 'Menunggu').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-amber-400 opacity-80" />
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Sedang Diproses</p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">
                {list.filter((i) => i.status === 'Diproses').length}
              </p>
            </div>
            <RefreshCw className="w-8 h-8 text-cyan-400 opacity-80" />
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Selesai Ditindaklanjuti</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">
                {list.filter((i) => i.status === 'Selesai').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-400 opacity-80" />
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari tiket, nama, no HP, atau isi..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
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
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Diproses">Diproses</option>
              <option value="Selesai">Selesai</option>
              <option value="Ditolak">Ditolak</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">No Tiket</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4">Terkait Layanan</th>
                  <th className="p-4">Nama Pemohon</th>
                  <th className="p-4">No Handphone</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      Tidak ada data pengaduan yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-emerald-400">{item.ticket_number}</td>
                      <td className="p-4 font-medium text-white">{item.category}</td>
                      <td className="p-4 text-slate-300">{item.service_unit}</td>
                      <td className="p-4">
                        {item.is_anonymous ? (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px]">
                            Anonim
                          </span>
                        ) : (
                          item.full_name
                        )}
                      </td>
                      <td className="p-4 text-slate-400">{item.phone_number}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                            item.status === 'Selesai'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : item.status === 'Diproses'
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                              : item.status === 'Ditolak'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(item)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition-all font-semibold"
                        >
                          Tindaklanjuti
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Detail & Respon */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs text-slate-400">Detail Pengaduan Tiket</span>
                <h3 className="font-mono text-lg font-bold text-emerald-400">{selectedItem.ticket_number}</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Kategori</span>
                <span className="text-white font-semibold text-sm">{selectedItem.category}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Terkait Layanan</span>
                <span className="text-white font-semibold text-sm">{selectedItem.service_unit}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Nama Pemohon</span>
                <span className="text-white font-semibold text-sm">
                  {selectedItem.is_anonymous ? 'Anonim' : selectedItem.full_name}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-500 block mb-1">Nomor WhatsApp</span>
                <span className="text-white font-semibold text-sm">{selectedItem.phone_number}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Isi Pengaduan / Aspirasi:</span>
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedItem.content}</p>
            </div>

            {/* Form Update Status & Respon */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ubah Status Pengaduan</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Menunggu', 'Diproses', 'Selesai', 'Ditolak'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        newStatus === st
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tanggapan / Respon Petugas Pusdatin</label>
                <textarea
                  rows={4}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="Tuliskan jawaban atau tindak lanjut resmi untuk pemohon..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveUpdate}
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Tanggapan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
