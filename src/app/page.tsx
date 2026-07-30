'use client';

import React, { useState } from 'react';
import { submitPengaduanAction, checkTicketStatusAction } from './actions';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  Send,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  UserCheck,
  UserX,
  Phone,
  Building2,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Info,
  Lock,
  MessageCircle,
  ShieldAlert
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Saran', label: 'Saran', icon: Sparkles, desc: 'Usulan perbaikan untuk peningkatan kualitas' },
  { id: 'Masukan', label: 'Masukan', icon: MessageSquare, desc: 'Pandangan konstruktif untuk layanan kami' },
  { id: 'Pengaduan', label: 'Pengaduan', icon: AlertCircle, desc: 'Laporan adanya ketidaksesuaian/pelanggaran' },
  { id: 'Keluhan', label: 'Keluhan', icon: ShieldAlert, desc: 'Kekecewaan atas pelayanan yang diterima' },
  { id: 'Informasi', label: 'Informasi', icon: Info, desc: 'Permohonan keterangan atau penjelasan' },
  { id: 'Tanggapan', label: 'Tanggapan', icon: MessageCircle, desc: 'Respon terhadap kebijakan atau pelayanan' },
];

const SERVICE_UNITS = [
  'Pelayanan Terpadu Satu Pintu (PTSP)',
  'Layanan Sub Tata Usaha',
  'Layanan Bimbingan Masyarakat Islam',
  'Layanan Pendidikan Agama & Keagamaan',
  'Layanan Penyelenggaraan Haji & Umrah',
  'Layanan Kepegawaian & Ortala',
  'Layanan Keuangan & BMN',
  'Layanan Pengawasan / Inspektorat',
  'Layanan Lainnya',
];

export default function PublicPage() {
  // Form State
  const [category, setCategory] = useState<string>('Pengaduan');
  const [serviceUnit, setServiceUnit] = useState<string>(SERVICE_UNITS[0]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; ticket?: string } | null>(null);

  // Search Ticket State
  const [searchTicket, setSearchTicket] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [ticketResult, setTicketResult] = useState<any>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    const formData = new FormData();
    formData.append('category', category);
    formData.append('service_unit', serviceUnit);
    formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
    formData.append('full_name', fullName);
    formData.append('phone_number', phone);
    formData.append('content', content);
    formData.append('cf-turnstile-response', turnstileToken);

    const res = await submitPengaduanAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setSubmitResult({
        success: true,
        message: res.message,
        ticket: res.ticket_number,
      });
      // Reset form
      setFullName('');
      setPhone('');
      setContent('');
      setIsAnonymous(false);
    } else {
      setSubmitResult({
        success: false,
        message: res.message,
      });
    }
  };

  const handleSearchTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicket.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setTicketResult(null);

    const res = await checkTicketStatusAction(searchTicket);
    setIsSearching(false);

    if (res.success) {
      setTicketResult(res.data);
    } else {
      setSearchError(res.message || 'Terjadi kesalahan saat mencari tiket.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-xl shadow-lg shadow-emerald-500/10">
              SG
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                SI-GESIT
                <span className="text-xs px-2 font-medium py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Kemenag
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#lacak-tiket"
              className="text-xs font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              Lacak Status Tiket
            </a>
            <a
              href="/pusdatin/auth"
              className="text-xs font-medium px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-900/20 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Panel Admin
            </a>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden pt-12 pb-16 bg-gradient-to-b from-slate-900 via-slate-800/80 to-slate-900 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
            <Sparkles className="w-4 h-4" />
            Layanan Pengaduan Resmi Masyarakat
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Sampaikan Aspirasi & Pengaduan Anda Bersama <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">SI-GESIT</span>
          </h2>
          <p className="text-slate-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-8">
            Platform terpadu untuk pengiriman Gagasan, Evaluasi, Saran, Informasi, maupun Tanggapan terkait seluruh unit layanan Kementerian Agama. Transparan, aman, dan langsung ditindaklanjuti.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Privasi Terjamin</p>
                <p className="text-[11px] text-slate-400">Dukungan opsi Anonim</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Respon Cepat</p>
                <p className="text-[11px] text-slate-400">Tim Pusdatin Siap</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Tiket Pengaduan</p>
                <p className="text-[11px] text-slate-400">Mudah dilacak</p>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Semua Layanan</p>
                <p className="text-[11px] text-slate-400">PTSP & Sub Tata Usaha</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 w-full space-y-12">
        {/* Lacak Tiket Section */}
        <section id="lacak-tiket" className="p-6 rounded-2xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-md shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-400" />
                Lacak Status Tiket Pengaduan
              </h3>
              <p className="text-xs text-slate-400">Masukkan kode tiket unik yang Anda dapatkan saat mengirimkan formulir (Contoh: SGT-20260731-9821)</p>
            </div>
          </div>
          <form onSubmit={handleSearchTicket} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={searchTicket}
              onChange={(e) => setSearchTicket(e.target.value)}
              placeholder="Masukkan nomor tiket SGT-XXXXXXXX-XXXX..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 uppercase tracking-wider"
              required
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/30 disabled:opacity-50 shrink-0"
            >
              {isSearching ? (
                <>Mencari...</>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Cari Tiket
                </>
              )}
            </button>
          </form>

          {/* Ticket Result Display */}
          {searchError && (
            <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {searchError}
            </div>
          )}

          {ticketResult && (
            <div className="mt-4 p-5 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-slate-200 text-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
                <div>
                  <span className="text-xs text-slate-400">Nomor Tiket</span>
                  <p className="font-mono text-base font-bold text-emerald-400">{ticketResult.ticket_number}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Status</span>
                  <p className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                    {ticketResult.status}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400">Kategori:</span> <span className="text-white font-medium">{ticketResult.category}</span>
                </div>
                <div>
                  <span className="text-slate-400">Terkait Layanan:</span> <span className="text-white font-medium">{ticketResult.service_unit}</span>
                </div>
                <div>
                  <span className="text-slate-400">Pengirim:</span> <span className="text-white font-medium">{ticketResult.is_anonymous ? 'Anonim (Rahasia)' : ticketResult.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400">Tanggal Dibuat:</span> <span className="text-white font-medium">{new Date(ticketResult.created_at).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Isi Pengaduan / Aspirasi:</span>
                <p className="text-xs bg-slate-950 p-3 rounded-lg text-slate-300 border border-slate-800">{ticketResult.content}</p>
              </div>
              {ticketResult.admin_response && (
                <div className="pt-2">
                  <span className="text-xs text-emerald-400 font-semibold block mb-1">Tanggapan / Respon Petugas Pusdatin:</span>
                  <p className="text-xs bg-emerald-950/40 p-3 rounded-lg text-emerald-200 border border-emerald-800/40">{ticketResult.admin_response}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Main Complaint Form Section */}
        <section className="p-6 md:p-8 rounded-3xl bg-slate-800/40 border border-slate-700/60 shadow-2xl backdrop-blur-md">
          <div className="mb-8 border-b border-slate-700/60 pb-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
              <FileText className="w-6 h-6 text-emerald-400" />
              Form Input Pengaduan Masyarakat
            </h3>
            <p className="text-sm text-slate-400">
              Silakan isi formulir di bawah ini dengan jelas dan lengkap. Anda juga dapat memilih opsi anonim untuk menjaga kerahasiaan identitas.
            </p>
          </div>

          {submitResult && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm border flex items-start gap-3 ${
                submitResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-200'
              }`}
            >
              {submitResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{submitResult.message}</p>
                {submitResult.ticket && (
                  <p className="text-xs">
                    Simpan nomor tiket Anda: <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-emerald-500/40">{submitResult.ticket}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Kategori Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Pilih Kategori <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => {
                  const IconComp = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500 shadow-md shadow-emerald-950'
                          : 'bg-slate-900/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-xs text-white">{cat.label}</span>
                        <IconComp className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terkait Layanan Apa */}
            <div>
              <label htmlFor="serviceUnit" className="block text-sm font-semibold text-slate-200 mb-2">
                Terkait Layanan Apa <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="serviceUnit"
                  value={serviceUnit}
                  onChange={(e) => setServiceUnit(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 appearance-none"
                  required
                >
                  {SERVICE_UNITS.map((unit) => (
                    <option key={unit} value={unit} className="bg-slate-900 text-white">
                      {unit}
                    </option>
                  ))}
                </select>
                <Building2 className="w-4 h-4 text-slate-400 absolute right-4 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Checkbox Anonim */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isAnonymous ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                  {isAnonymous ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                </div>
                <div>
                  <label htmlFor="anonymousCheckbox" className="text-sm font-semibold text-white cursor-pointer select-none">
                    Kirim Sebagai Anonim
                  </label>
                  <p className="text-xs text-slate-400">Nama lengkap Anda tidak akan dipublikasikan atau terlihat oleh publik.</p>
                </div>
              </div>
              <input
                type="checkbox"
                id="anonymousCheckbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
              />
            </div>

            {/* Form Input Data Pemohon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-slate-200 mb-1.5">
                  Nama Lengkap {!isAnonymous && <span className="text-rose-400">*</span>}
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isAnonymous}
                  placeholder={isAnonymous ? 'Disembunyikan (Anonim)' : 'Masukkan nama lengkap sesuai KTP'}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 disabled:bg-slate-950"
                  required={!isAnonymous}
                />
              </div>

              {/* Nomor Handphone / WA */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-200 mb-1.5">
                  Nomor Handphone / WhatsApp <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Isi Pengaduan */}
            <div>
              <label htmlFor="content" className="block text-sm font-semibold text-slate-200 mb-1.5">
                Isi Pengaduan / Aspirasi / Saran <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Uraikan detail pengaduan, masukan, keluhan atau informasi yang ingin disampaikan..."
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            {/* Cloudflare Turnstile Captcha Widget */}
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verifikasi Keamanan Bot (Cloudflare Turnstile)
              </p>
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADR1O_LSp1lgc3km'}
                onSuccess={(token) => setTurnstileToken(token)}
                options={{ theme: 'dark' }}
              />
            </div>

            {/* Tombol Kirim Form */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-bold transition-all shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Mengirimkan Data...</>
              ) : (
                <>
                  <Send className="w-5 h-5" /> Kirim Pengaduan SI-GESIT
                </>
              )}
            </button>
          </form>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} SI-GESIT - Kementerian Agama Republik Indonesia.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <a href="#lacak-tiket" className="hover:text-emerald-400 transition-colors">Lacak Tiket</a>
            <span>•</span>
            <a href="/pusdatin/auth" className="hover:text-emerald-400 transition-colors">Pusdatin Admin</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
