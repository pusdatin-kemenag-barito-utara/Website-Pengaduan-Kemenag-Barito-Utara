'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { submitPengaduanAction, checkTicketStatusAction, submitTicketRatingAction } from './actions';
import { Pengaduan } from '@/lib/supabase';
import { Turnstile } from '@marsidev/react-turnstile';
import {
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  Phone,
  Building2,
  MessageSquare,
  Sparkles,
  Info,
  MessageCircle,
  ShieldAlert,
  X,
  Paperclip,
  Printer,
  Star,
  Download,
  ChevronDown,
  Check,
  QrCode
} from 'lucide-react';

const CATEGORIES = [
  { id: 'Saran', label: 'Saran', icon: Sparkles, desc: 'Usulan perbaikan layanan' },
  { id: 'Masukan', label: 'Masukan', icon: MessageSquare, desc: 'Pandangan konstruktif' },
  { id: 'Pengaduan', label: 'Pengaduan', icon: AlertCircle, desc: 'Laporan ketidaksesuaian' },
  { id: 'Keluhan', label: 'Keluhan', icon: ShieldAlert, desc: 'Kekecewaan pelayanan' },
  { id: 'Informasi', label: 'Informasi', icon: Info, desc: 'Permohonan keterangan' },
  { id: 'Tanggapan', label: 'Tanggapan', icon: MessageCircle, desc: 'Respon kebijakan' },
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
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; ticket?: string } | null>(null);

  // Floating Modal Lacak Tiket State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchTicket, setSearchTicket] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [ticketResult, setTicketResult] = useState<Pengaduan | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Rating & Ulasan State (Fitur 6)
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [userFeedback, setUserFeedback] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);

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
    if (attachment) {
      formData.append('attachment', attachment);
    }

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
      setAttachment(null);
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
    setRatingMsg(null);

    const res = await checkTicketStatusAction(searchTicket);
    setIsSearching(false);

    if (res.success) {
      setTicketResult(res.data);
      if (res.data.rating) {
        setRatingVal(res.data.rating);
      }
      if (res.data.user_feedback) {
        setUserFeedback(res.data.user_feedback);
      }
    } else {
      setSearchError(res.message || 'Terjadi kesalahan saat mencari tiket.');
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketResult?.ticket_number) return;

    setIsSubmittingRating(true);
    setRatingMsg(null);

    const res = await submitTicketRatingAction(ticketResult.ticket_number, ratingVal, userFeedback);
    setIsSubmittingRating(false);

    if (res.success) {
      setRatingMsg('Terima kasih! Ulasan & Penilaian Anda telah tersimpan.');
      setTicketResult({
        ...ticketResult,
        rating: ratingVal,
        user_feedback: userFeedback,
      });
    } else {
      setRatingMsg(res.message || 'Gagal mengirimkan ulasan.');
    }
  };

  // Fitur 5: Print Bukti Pengaduan
  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Bar Header - Responsive Mobile Layout */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-emerald-100 px-3 sm:px-8 md:px-12 py-2.5 sm:py-4 shadow-sm print:hidden">
        <div className="w-full flex items-center justify-between gap-2">
          {/* Logo & Identity */}
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <Image
              src="/kemenag.svg"
              alt="Logo Kemenag"
              width={34}
              height={34}
              className="object-contain shrink-0 sm:w-11 sm:h-11"
              priority
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
                <h1 className="font-extrabold text-base sm:text-xl tracking-tight text-slate-900 leading-none">
                  SI-GESIT
                </h1>
                <span className="text-[10px] sm:text-xs px-2 sm:px-3 font-bold py-0.5 sm:py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                  Barito Utara
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block font-medium truncate mt-0.5">
                Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/barcode"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all font-bold text-xs sm:text-sm cursor-pointer shrink-0"
              title="Lihat QR Code Aplikasi"
            >
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
              <span className="hidden sm:inline">QR Code</span>
            </Link>

            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all shadow-sm font-bold text-xs sm:text-sm cursor-pointer shrink-0"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span className="hidden xs:inline sm:inline">Lacak Tiket</span>
              <span className="inline xs:hidden sm:hidden">Lacak</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Mobile Margins & Padding */}
      <main className="w-full px-3 sm:px-8 md:px-12 py-4 sm:py-10 md:py-14 flex-1 print:p-0">
        {/* Main Complaint Form Card */}
        <section className="p-4 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm sm:shadow-md w-full print:border-none print:shadow-none">
          {/* Header Title */}
          <div className="mb-6 sm:mb-10 border-b border-slate-100 pb-4 sm:pb-8">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-slate-900 flex items-center gap-2.5 sm:gap-4 mb-1.5 sm:mb-3">
              <FileText className="w-5 h-5 sm:w-8 sm:h-8 text-emerald-600 shrink-0" />
              Form Input Pengaduan
            </h2>
            <p className="text-xs sm:text-base md:text-lg text-slate-600 font-medium leading-relaxed">
              Isi formulir dengan jelas dan lengkap. Dukungan penuh pengiriman secara Anonim dan lampiran berkas.
            </p>
          </div>

          {submitResult && (
            <div
              className={`mb-6 sm:mb-10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl text-xs sm:text-base border flex flex-col sm:flex-row items-start justify-between gap-4 ${
                submitResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {submitResult.success ? (
                  <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 sm:space-y-2">
                  <p className="font-extrabold text-sm sm:text-lg">{submitResult.message}</p>
                  {submitResult.ticket && (
                    <p className="text-xs sm:text-base">
                      Nomor tiket Anda: <span className="font-mono font-bold text-emerald-900 bg-white px-2.5 sm:px-4 py-1 rounded-lg border border-emerald-300 shadow-sm inline-block mt-1">{submitResult.ticket}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Fitur 5: Tombol Cetak Bukti Tiket setelah Sukses */}
              {submitResult.success && submitResult.ticket && (
                <button
                  type="button"
                  onClick={handlePrintTicket}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm shrink-0 cursor-pointer self-stretch sm:self-auto justify-center print:hidden"
                >
                  <Printer className="w-4 h-4" /> Cetak Bukti Pengaduan
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-10 w-full print:hidden">
            {/* Kategori Selector - Mobile Grid 2 Cols */}
            <div>
              <label className="block text-sm sm:text-lg font-extrabold text-slate-900 mb-2.5 sm:mb-4">
                Pilih Kategori <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-4">
                {CATEGORIES.map((cat) => {
                  const IconComp = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between h-full ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/50 shadow-sm sm:shadow-md'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 sm:mb-3">
                        <span className="font-extrabold text-xs sm:text-base text-slate-900">{cat.label}</span>
                        <IconComp className={`w-3.5 h-3.5 sm:w-5 sm:h-5 shrink-0 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <span className="text-[10px] sm:text-xs text-slate-500 leading-tight font-medium line-clamp-2">{cat.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Terkait Layanan Apa - Custom Modern Picker Component */}
            <div>
              <label className="block text-sm sm:text-lg font-extrabold text-slate-900 mb-2 sm:mb-4">
                Terkait Layanan Apa <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`w-full px-4 sm:px-6 py-3.5 sm:py-4.5 rounded-2xl bg-slate-50 border text-left flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs ${
                    isDropdownOpen
                      ? 'border-emerald-600 ring-4 ring-emerald-600/15 bg-white'
                      : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-extrabold text-xs sm:text-base text-slate-900 truncate">
                      {serviceUnit}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isDropdownOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Options Popup Container */}
                {isDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsDropdownOpen(false)}
                    />
                    <div className="absolute left-0 right-0 top-full mt-2 z-30 p-2 rounded-2xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15 max-h-72 overflow-y-auto space-y-1 animate-in fade-in-50 zoom-in-95 duration-150">
                      {SERVICE_UNITS.map((unit) => {
                        const isSelected = serviceUnit === unit;
                        return (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => {
                              setServiceUnit(unit);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-3 rounded-xl text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span className="truncate">{unit}</span>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Custom Interactive Toggle Switch / Checkbox Component */}
            <div
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer select-none ${
                isAnonymous
                  ? 'bg-amber-500/10 border-amber-300/90 shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
              }`}
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div
                  className={`p-2.5 sm:p-3 rounded-2xl transition-colors ${
                    isAnonymous ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isAnonymous ? <UserX className="w-5 h-5 sm:w-7 sm:h-7" /> : <UserCheck className="w-5 h-5 sm:w-7 sm:h-7" />}
                </div>
                <div>
                  <h4 className="text-xs sm:text-lg font-extrabold text-slate-900">
                    Kirim Sebagai Anonim
                  </h4>
                  <p className="text-[11px] sm:text-sm text-slate-500 font-medium leading-tight">
                    Identitas Anda disembunyikan dan tidak akan terlihat oleh publik.
                  </p>
                </div>
              </div>

              {/* Custom Animated Toggle Switch Button */}
              <div
                className={`w-12 sm:w-14 h-7 sm:h-8 rounded-full p-1 transition-colors duration-300 flex items-center shrink-0 ${
                  isAnonymous ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                    isAnonymous ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {isAnonymous && <Check className="w-3 h-3 text-amber-600" />}
                </div>
              </div>
            </div>

            {/* Form Input Data Pemohon */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              {/* Nama Lengkap */}
              <div>
                <label htmlFor="fullName" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-3">
                  Nama Lengkap {!isAnonymous && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => {
                    const filtered = e.target.value.replace(/[^a-zA-Z\s'.,`-]/g, '');
                    setFullName(filtered);
                  }}
                  disabled={isAnonymous}
                  placeholder={isAnonymous ? 'Disembunyikan (Anonim)' : 'Nama lengkap (hanya huruf & tanda)'}
                  className="w-full px-3.5 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-base focus:outline-none focus:border-emerald-600 disabled:opacity-50 disabled:bg-slate-100 font-bold"
                  required={!isAnonymous}
                />
              </div>

              {/* Nomor Handphone / WA */}
              <div>
                <label htmlFor="phone" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-3">
                  Nomor Handphone / WA <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => {
                      const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                      if (onlyNums.length <= 13) {
                        setPhone(onlyNums);
                      }
                    }}
                    minLength={10}
                    maxLength={13}
                    pattern="[0-9]{10,13}"
                    placeholder="Contoh: 081234567890 (10-13 angka)"
                    className="w-full px-3.5 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-bold pr-10"
                    required
                  />
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 sm:right-5 top-3 sm:top-4.5 pointer-events-none" />
                </div>
                <span className="text-[10px] sm:text-xs text-slate-400 mt-1 block font-medium">Hanya angka (min 10 - maks 13 digit)</span>
              </div>
            </div>

            {/* Isi Pengaduan */}
            <div>
              <label htmlFor="content" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-3">
                Isi Pengaduan / Aspirasi / Saran <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="content"
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Uraikan detail pengaduan, masukan, keluhan atau informasi..."
                className="w-full px-3.5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-medium"
                required
              />
            </div>

            {/* Fitur 1: Upload Lampiran File Pendukung (Opsional dengan Drag & Drop) */}
            <div>
              <label htmlFor="attachment" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-3 flex items-center justify-between">
                <span>Lampiran Berkas / Bukti Pendukung <span className="text-slate-400 font-normal text-xs">(Opsional)</span></span>
                <span className="text-[11px] text-slate-400 font-normal">PNG, JPG, PDF (Maks. 5MB)</span>
              </label>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const droppedFile = e.dataTransfer.files[0];
                    if (['image/png', 'image/jpeg', 'application/pdf'].includes(droppedFile.type)) {
                      setAttachment(droppedFile);
                    } else {
                      alert('Format file tidak didukung. Harap pilih PNG, JPG, atau PDF.');
                    }
                  }
                }}
                className={`relative p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                  isDragging
                    ? 'border-emerald-600 bg-emerald-50/80 ring-4 ring-emerald-600/20 scale-[1.01]'
                    : attachment
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
                }`}
              >
                <input
                  type="file"
                  id="attachment"
                  accept="image/png, image/jpeg, application/pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                {attachment ? (
                  <div className="flex items-center gap-3 text-emerald-900 font-bold text-xs sm:text-sm">
                    <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-slate-900 truncate max-w-xs">{attachment.name}</p>
                      <p className="text-[10px] text-emerald-700 font-semibold">{(attachment.size / (1024 * 1024)).toFixed(2)} MB • Klik atau tarik file lain untuk mengganti</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAttachment(null);
                      }}
                      className="ml-auto p-1.5 rounded-xl hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors z-20"
                      title="Hapus berkas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center mx-auto text-emerald-600">
                      <Paperclip className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-800">
                        {isDragging ? 'Lepaskan file di sini...' : 'Tarik & Lepaskan berkas di sini'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">atau <span className="text-emerald-700 font-bold underline">pilih berkas dari perangkat Anda</span></p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cloudflare Turnstile Captcha Widget */}
            <div className="flex justify-center my-3 sm:my-6 overflow-hidden">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADR1O_LSp1lgc3km'}
                onSuccess={(token) => setTurnstileToken(token)}
                options={{ theme: 'light' }}
              />
            </div>

            {/* Tombol Kirim Form */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 sm:py-5 px-6 sm:px-10 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm sm:text-lg font-black transition-all shadow-md sm:shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>Mengirimkan Data...</>
              ) : (
                <>
                  <Send className="w-4 h-4 sm:w-7 sm:h-7" /> Kirim Pengaduan SI-GESIT
                </>
              )}
            </button>
          </form>
        </section>
      </main>

      {/* Floating Modal Lacak Status Tiket with Glassmorphism & Micro-animations */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-all animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-2xl p-5 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-900/20 space-y-6 max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Lacak Status Tiket</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">Pantau progres penanganan aspirasi & pengaduan Anda</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchError(null);
                  setTicketResult(null);
                  setRatingMsg(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Input Search Form with Animated Submit Button */}
            <form onSubmit={handleSearchTicket} className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchTicket}
                  onChange={(e) => setSearchTicket(e.target.value)}
                  placeholder="Contoh: SGT-20260731-1001"
                  className="w-full px-4 sm:px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 focus:bg-white uppercase tracking-widest font-mono font-bold transition-all shadow-inner"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-6 sm:px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 disabled:opacity-50 shrink-0 cursor-pointer flex items-center justify-center gap-2.5 group"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mencari Tiket...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 transition-transform group-hover:scale-110 group-hover:rotate-6" />
                    <span>Cari Tiket</span>
                  </>
                )}
              </button>
            </form>

            {/* Error Message Display */}
            {searchError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3 font-semibold animate-in slide-in-from-top-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                <span>{searchError}</span>
              </div>
            )}

            {/* Premium Ticket Result Card */}
            {ticketResult && (
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-b from-slate-50 to-emerald-50/30 border border-emerald-200/80 text-slate-800 text-xs sm:text-sm space-y-5 shadow-sm animate-in fade-in-50 duration-300">
                {/* Header Ticket Info */}
                <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 pb-4 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">Nomor Tiket Pengaduan</span>
                    <p className="font-mono text-lg sm:text-xl font-black text-emerald-800 tracking-wide mt-0.5">{ticketResult.ticket_number}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Fitur 5: Tombol Cetak Bukti dari Modal */}
                    <button
                      type="button"
                      onClick={handlePrintTicket}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-emerald-700 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                      title="Cetak Bukti Pengaduan"
                    >
                      <Printer className="w-4 h-4 text-emerald-600" />
                      <span className="hidden sm:inline">Cetak</span>
                    </button>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Status Progres</span>
                      <span
                        className={`inline-block text-xs font-black px-3.5 py-1.5 rounded-full border shadow-xs ${
                          ticketResult.status === 'Selesai'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : ticketResult.status === 'Diproses'
                            ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                            : ticketResult.status === 'Ditolak'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {ticketResult.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">Kategori</span>
                    <span className="text-slate-900 font-extrabold text-xs sm:text-sm">{ticketResult.category}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">Terkait Layanan</span>
                    <span className="text-slate-900 font-extrabold text-xs sm:text-sm">{ticketResult.service_unit}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">Pengirim</span>
                    <span className="text-slate-900 font-extrabold text-xs sm:text-sm">{ticketResult.is_anonymous ? 'Anonim (Disembunyikan)' : ticketResult.full_name}</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/70 shadow-xs">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block mb-0.5">Tanggal Dibuat</span>
                    <span className="text-slate-900 font-extrabold text-xs sm:text-sm">
                      {ticketResult.created_at ? new Date(ticketResult.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </span>
                  </div>
                </div>

                {/* Content Box */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Uraian Isi Pengaduan</span>
                  <div className="bg-white p-4 rounded-2xl text-slate-800 border border-slate-200/80 leading-relaxed whitespace-pre-wrap font-medium text-xs sm:text-sm shadow-xs">
                    {ticketResult.content}
                  </div>
                </div>

                {/* Fitur 1: Display File Attachment link if exists */}
                {ticketResult.file_url && (
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800">Lampiran Berkas Pendukung</span>
                    </div>
                    <a
                      href={ticketResult.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" /> Lihat Berkas
                    </a>
                  </div>
                )}

                {/* Admin Response Box */}
                {ticketResult.admin_response ? (
                  <div className="space-y-1.5 pt-2 border-t border-emerald-200/60">
                    <span className="text-[11px] text-emerald-800 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Tanggapan Respon Petugas Pusdatin
                    </span>
                    <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-950 border border-emerald-300/80 leading-relaxed whitespace-pre-wrap font-semibold text-xs sm:text-sm shadow-xs">
                      {ticketResult.admin_response}
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Laporan sedang dalam antrian penanganan petugas Pusdatin Kemenag Barito Utara.</span>
                  </div>
                )}

                {/* Fitur 6: Rating & Ulasan Balik dari Pengadu (Tersedia jika status Tiket Selesai atau sudah direspon) */}
                {(ticketResult.status === 'Selesai' || ticketResult.admin_response) && (
                  <form onSubmit={handleRatingSubmit} className="pt-4 border-t border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Berikan Penilaian & Ulasan Layanan
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingVal(star)}
                            className="p-1 hover:scale-110 transition-transform cursor-pointer"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= ratingVal ? 'text-amber-500 fill-amber-500' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={userFeedback}
                      onChange={(e) => setUserFeedback(e.target.value)}
                      placeholder="Bagaimana kepuasan Anda terhadap kecepatan & jawaban respon petugas?"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-emerald-600 font-medium"
                    />

                    {ratingMsg && (
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                        {ratingMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingRating}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingRating ? 'Menyimpan...' : 'Kirim Ulasan Layanan'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer - Light Theme Mobile Friendly */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 sm:py-6 text-center text-xs text-slate-500 px-4 sm:px-8 print:hidden">
        <div className="w-full flex items-center justify-center font-medium">
          <p>© {new Date().getFullYear()} SI-GESIT - Kementerian Agama Kabupaten Barito Utara.</p>
        </div>
      </footer>
    </div>
  );
}
