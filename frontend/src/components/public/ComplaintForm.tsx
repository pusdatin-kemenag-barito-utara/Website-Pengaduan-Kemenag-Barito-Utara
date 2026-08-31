import { useEffect, useState } from 'react';
import {
  AlertCircle, Building2, Check, CheckCircle2, ChevronDown, Download,
  FileText, Info, Paperclip, Phone, RotateCcw,
  Send, Sparkles, UserCheck, UserX, X,
} from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import ModernDatePicker from '../ModernDatePicker';
import { submitPengaduan } from '../../lib/api';
import type { Layanan } from '../../lib/api';
import { analytics } from '../../lib/analytics';
import { CATEGORIES, TURNSTILE_SITE_KEY, type SubmittedDetails } from './types';

const DRAFT_KEY = 'sigesit_complaint_draft';

interface ComplaintFormProps {
  serviceUnitsList: Layanan[];
  isLayananLoading: boolean;
  onSuccessSubmit: (details: SubmittedDetails) => void;
  onDownloadTicket: () => void;
  isDownloading: boolean;
}

export default function ComplaintForm({
  serviceUnitsList,
  isLayananLoading,
  onSuccessSubmit,
  onDownloadTicket,
  isDownloading,
}: ComplaintFormProps) {
  // Form State
  const [category, setCategory] = useState<string>('Pengaduan');
  const [serviceUnit, setServiceUnit] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');

  const [subject, setSubject] = useState<string>('');
  const [eventDate, setEventDate] = useState<string>('');
  const [formStartTime, setFormStartTime] = useState<number | null>(null);
  const [eventLocation, setEventLocation] = useState<string>('');
  const [officerName, setOfficerName] = useState<string>('');
  const [infoPurpose, setInfoPurpose] = useState<string>('');
  const [expectedImpact, setExpectedImpact] = useState<string>('');

  const [content, setContent] = useState<string>('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [fileErrorMsg, setFileErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>('');

  // Draft State
  const [isDraftRestored, setIsDraftRestored] = useState<boolean>(false);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; ticket?: string } | null>(null);

  // 1. Restore Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.category) setCategory(parsed.category);
        if (parsed.serviceUnit) setServiceUnit(parsed.serviceUnit);
        if (parsed.isAnonymous !== undefined) setIsAnonymous(parsed.isAnonymous);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.eventDate) setEventDate(parsed.eventDate);
        if (parsed.eventLocation) setEventLocation(parsed.eventLocation);
        if (parsed.officerName) setOfficerName(parsed.officerName);
        if (parsed.infoPurpose) setInfoPurpose(parsed.infoPurpose);
        if (parsed.expectedImpact) setExpectedImpact(parsed.expectedImpact);
        if (parsed.content) setContent(parsed.content);
        setIsDraftRestored(true);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  // 2. Auto-Save Draft
  useEffect(() => {
    if (content || subject || fullName || phone || serviceUnit) {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            category,
            serviceUnit,
            isAnonymous,
            fullName,
            phone,
            subject,
            eventDate,
            eventLocation,
            officerName,
            infoPurpose,
            expectedImpact,
            content,
          }),
        );
      } catch {
        /* ignore storage errors */
      }
    }
  }, [category, serviceUnit, isAnonymous, fullName, phone, subject, eventDate, eventLocation, officerName, infoPurpose, expectedImpact, content]);

  const handleResetDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setCategory('Pengaduan');
    setServiceUnit('');
    setIsAnonymous(false);
    setFullName('');
    setPhone('');
    setSubject('');
    setEventDate('');
    setEventLocation('');
    setOfficerName('');
    setInfoPurpose('');
    setExpectedImpact('');
    setContent('');
    setAttachment(null);
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    setFileErrorMsg(null);
    setIsDraftRestored(false);
  };

  // Helper Sanitasi & Normalisasi Nomor HP / WA (+62 -> 08)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9+]/g, '');
    if (val.startsWith('+62')) {
      val = '0' + val.slice(3);
    } else if (val.startsWith('62') && val.length > 2) {
      val = '0' + val.slice(2);
    }
    val = val.replace(/[^0-9]/g, '').slice(0, 13);
    setPhone(val);
  };

  const isPhoneValid = phone.length >= 10 && phone.length <= 13 && phone.startsWith('08');

  // Form Progress Completion Counter (0 - 100%)
  const formProgress = (() => {
    let score = 0;
    const total = 4;
    if (serviceUnit) score++;
    if (isAnonymous || fullName.trim()) score++;
    if (isPhoneValid) score++;
    if (content.trim()) score++;
    return Math.round((score / total) * 100);
  })();

  // Validasi Kelengkapan Form Wajib & Turnstile Token
  const isFormValid = (() => {
    if (!serviceUnit) return false;
    if (!phone || !isPhoneValid) return false;
    if (!isAnonymous && !fullName.trim()) return false;
    if (!content.trim()) return false;
    if ((category === 'Saran' || category === 'Masukan' || category === 'Pengaduan') && !subject.trim()) return false;
    if (category === 'Pengaduan' && !eventLocation.trim()) return false;
    if (category === 'Keluhan' && !officerName.trim()) return false;
    if (category === 'Informasi' && !infoPurpose.trim()) return false;
    if (category === 'Tanggapan' && !subject.trim()) return false;
    if (!turnstileToken) return false;
    return true;
  })();

  // Helper validasi berkas lampiran (Format & Maksimal 5MB) + Thumbnail
  const validateAndSetFile = (file: File) => {
    setFileErrorMsg(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setFileErrorMsg('Format berkas tidak didukung! Harap pilih file PNG, JPG, WEBP, atau PDF.');
      return false;
    }
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileErrorMsg(`Ukuran berkas terlalu besar (${sizeMB} MB)! Maksimal ukuran lampiran adalah 5 MB.`);
      return false;
    }

    setAttachment(file);
    analytics.complaintAttachmentUploaded(file.type, file.size / 1024);
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setAttachmentPreview(previewUrl);
    }
    return true;
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview);
      setAttachmentPreview(null);
    }
    setFileErrorMsg(null);
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!serviceUnit) {
      setSubmitResult({ success: false, message: 'Harap pilih unit layanan terlebih dahulu!' });
      analytics.complaintSubmitFailed('missing_unit', 'Unit layanan belum dipilih');
      return;
    }
    if (!isPhoneValid) {
      setSubmitResult({ success: false, message: 'Harap isi nomor WhatsApp/HP yang valid (diawali 08, 10-13 digit)!' });
      analytics.complaintSubmitFailed('invalid_phone', 'Nomor HP/WA tidak valid');
      return;
    }
    if (attachment && attachment.size > 5 * 1024 * 1024) {
      setSubmitResult({
        success: false,
        message: `Ukuran berkas lampiran (${(attachment.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 5MB! Harap pilih file yang lebih kecil.`,
      });
      analytics.complaintSubmitFailed('file_too_large', 'Ukuran file melebihi batas 5MB');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);
    analytics.complaintSubmitAttempt(category, serviceUnit);

    let finalContent = content.trim();
    if (category === 'Saran') {
      finalContent =
        `[JUDUL SARAN]: ${subject.trim()}\n\n[DETAIL URAIAN GAGASAN]: ${content.trim()}` +
        (expectedImpact.trim() ? `\n\n[DAMPAK/MANFAAT DIHARAPKAN]: ${expectedImpact.trim()}` : '');
    } else if (category === 'Masukan') {
      finalContent =
        `[SUBJEK MASUKAN]: ${subject.trim()}\n\n[URAIAN MASUKAN KONSTRUKTIF]: ${content.trim()}` +
        (expectedImpact.trim() ? `\n\n[HARAPAN EVALUASI]: ${expectedImpact.trim()}` : '');
    } else if (category === 'Pengaduan') {
      finalContent =
        `[JUDUL PENGADUAN]: ${subject.trim()}\n` +
        (eventDate ? `[TANGGAL KEJADIAN]: ${eventDate}\n` : '') +
        (eventLocation.trim() ? `[LOKASI KEJADIAN]: ${eventLocation.trim()}\n` : '') +
        `\n[KRONOLOGI & DETAIL PENGADUAN]: ${content.trim()}`;
    } else if (category === 'Keluhan') {
      finalContent =
        `[JUDUL KELUHAN]: ${subject.trim()}\n` +
        (officerName.trim() ? `[PETUGAS/UNIT TERKAIT]: ${officerName.trim()}\n` : '') +
        `\n[URAIAN KELUHAN PELAYANAN]: ${content.trim()}`;
    } else if (category === 'Informasi') {
      finalContent =
        `[SUBJEK INFORMASI]: ${subject.trim()}\n` +
        (infoPurpose.trim() ? `[TUJUAN PENGGUNAAN]: ${infoPurpose.trim()}\n` : '') +
        `\n[RINCIAN INFORMASI DIBUTUHKAN]: ${content.trim()}`;
    } else if (category === 'Tanggapan') {
      finalContent = `[PROGRAM/KEBIJAKAN DITANGGAPI]: ${subject.trim()}\n\n[URAIAN TANGGAPAN & RESPON]: ${content.trim()}`;
    }

    const formData = new FormData();
    formData.append('category', category);
    formData.append('service_unit', serviceUnit);
    formData.append('is_anonymous', isAnonymous ? 'true' : 'false');
    formData.append('full_name', fullName);
    formData.append('phone_number', phone);
    formData.append('content', finalContent);
    formData.append('cf-turnstile-response', turnstileToken);
    if (attachment) {
      formData.append('attachment', attachment);
    }

    try {
      const res = await submitPengaduan(formData);
      setSubmitResult({ success: true, message: res.message, ticket: res.ticket_number });

      const details: SubmittedDetails = {
        ticket: res.ticket_number!,
        category,
        serviceUnit,
        fullName: isAnonymous ? 'Anonim' : fullName,
        phone,
        isAnonymous,
        subject: subject || category,
        content: finalContent,
        attachmentName: attachment?.name,
        eventDate,
        eventLocation,
        status: 'Menunggu',
        createdAt: new Date().toLocaleDateString('id-ID', {
          day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
        }),
      };

      const durationSec = formStartTime ? Math.round((Date.now() - formStartTime) / 1000) : 0;
      onSuccessSubmit(details);
      analytics.submitPengaduan(category, serviceUnit, isAnonymous, durationSec);

      // Bersihkan draft tersimpan
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }

      setFullName('');
      setPhone('');
      setContent('');
      setSubject('');
      setEventDate('');
      setEventLocation('');
      setOfficerName('');
      setInfoPurpose('');
      setExpectedImpact('');
      handleRemoveAttachment();
      setServiceUnit('');
      setIsAnonymous(false);
      setTurnstileToken('');
      setIsDraftRestored(false);
      setFormStartTime(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim pengaduan. Silakan coba lagi.';
      setSubmitResult({
        success: false,
        message: errMsg,
      });
      analytics.complaintSubmitFailed('server_error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategoryObj = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="lg:col-span-8 xl:col-span-8 bg-white/95 backdrop-blur-xl rounded-3xl sm:rounded-4xl p-5 sm:p-8 md:p-10 shadow-xl border border-slate-200/80 transition-all flex flex-col">
      {/* Header Form & Draft Status */}
      <div className="mb-5 sm:mb-6 border-b border-slate-100 pb-4 sm:pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0 shadow-xs">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Form Input Pengaduan</h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                Isi formulir dengan jelas dan lengkap. Dukungan penuh pengiriman secara Anonim.
              </p>
            </div>
          </div>

          {/* Form Progress Completion */}
          <div className="flex items-center justify-center gap-2 self-center sm:self-auto bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="w-16 sm:w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${formProgress}%` }}
              />
            </div>
            <span className="text-[11px] font-black text-slate-700">{formProgress}% Lengkap</span>
          </div>
        </div>

        {/* Restored Draft Banner */}
        {isDraftRestored && (
          <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-fadeIn">
            <span className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Draft pengaduan terakhir Anda otomatis dipulihkan.
            </span>
            <button
              type="button"
              onClick={handleResetDraft}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" /> Reset Form
            </button>
          </div>
        )}
      </div>

      {/* Alert Status Pengiriman */}
      {submitResult && (
        <div
          className={`mb-4 sm:mb-6 p-4 sm:p-5 rounded-2xl text-xs sm:text-base border flex flex-col sm:flex-row items-start justify-between gap-4 animate-fadeIn ${
            submitResult.success ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'
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
                  Nomor tiket Anda:{' '}
                  <span className="font-bold text-emerald-900 bg-white px-2.5 sm:px-4 py-1 rounded-lg border border-emerald-300 shadow-sm inline-block mt-1">
                    {submitResult.ticket}
                  </span>
                </p>
              )}
            </div>
          </div>

          {submitResult.success && submitResult.ticket && (
            <button
              type="button"
              onClick={onDownloadTicket}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isDownloading ? 'Mengunduh...' : 'Download Bukti Tiket'}</span>
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 w-full print:hidden">
        {/* Kategori Selector */}
        <div>
          <label id="categoryGroupLabel" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-2">
            Pilih Kategori <span className="text-rose-500">*</span>
          </label>
          <div role="radiogroup" aria-labelledby="categoryGroupLabel" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${cat.label}: ${cat.desc}`}
                  onClick={() => {
                    if (!formStartTime) setFormStartTime(Date.now());
                    setCategory(cat.id);
                    analytics.complaintCategorySelected(cat.id, cat.label);
                  }}
                  className={`p-3 sm:p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer active:scale-95 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/30 text-emerald-950 shadow-sm'
                      : 'border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1 sm:mb-2">
                    <span className={`p-1.5 rounded-xl ${isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200/70 text-slate-600'}`}>
                      <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm">{cat.label}</h3>
                    <p className="text-[10px] text-slate-600 font-medium leading-tight mt-0.5 line-clamp-1">{cat.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Micro-Guide Penjelasan Kategori Aktif */}
          {currentCategoryObj && (
            <div className="mt-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2 text-slate-600 text-xs">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>{currentCategoryObj.label}:</strong> {currentCategoryObj.desc}.
              </span>
            </div>
          )}
        </div>

        {/* Terkait Unit Layanan Selector */}
        <div className="relative">
          <label htmlFor="serviceUnitDropdown" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-2">
            Terkait Layanan Apa <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <button
              id="serviceUnitDropdown"
              type="button"
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              aria-label="Pilih unit layanan terkait"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-3.5 sm:px-5 py-3 sm:py-3.5 rounded-2xl bg-slate-50 border border-slate-300 text-left flex items-center justify-between focus:outline-none focus:border-emerald-600 transition-colors text-xs sm:text-sm font-bold text-slate-800 cursor-pointer"
            >
              <span className="flex items-center gap-2.5 truncate">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                <span className={serviceUnit ? 'text-slate-900' : 'text-slate-500 font-medium'}>
                  {serviceUnit || '-- Pilih Unit Layanan --'}
                </span>
              </span>
              <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div role="listbox" aria-label="Daftar unit layanan" className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xl z-30 max-h-56 overflow-y-auto p-1.5 animate-fadeIn">
                {isLayananLoading ? (
                  <div className="p-3.5 text-center text-xs text-slate-600 font-medium">Memuat data unit layanan...</div>
                ) : serviceUnitsList.length === 0 ? (
                  <div className="p-3.5 text-center text-xs text-slate-600 font-medium">Tidak ada unit layanan aktif.</div>
                ) : (
                  serviceUnitsList.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      role="option"
                      aria-selected={serviceUnit === unit.name}
                      onClick={() => {
                        if (!formStartTime) setFormStartTime(Date.now());
                        setServiceUnit(unit.name);
                        setIsDropdownOpen(false);
                        analytics.complaintUnitSelected(unit.name);
                      }}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-between cursor-pointer ${
                        serviceUnit === unit.name ? 'bg-emerald-50 text-emerald-950 font-black' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{unit.name}</span>
                      {serviceUnit === unit.name && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Kirim Sebagai Anonim Toggle */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isAnonymous ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
              {isAnonymous ? <UserX className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-extrabold text-xs sm:text-sm text-slate-900">Kirim Sebagai Anonim</p>
              <p className="text-[10px] sm:text-xs text-slate-600 font-medium">
                Identitas Anda disembunyikan dan tidak akan terlihat oleh publik.
              </p>
            </div>
          </div>
          <label htmlFor="anonymousToggle" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="anonymousToggle"
              aria-label="Kirim pengaduan sebagai anonim"
              checked={isAnonymous}
              onChange={(e) => {
                setIsAnonymous(e.target.checked);
                analytics.complaintAnonymousToggled(e.target.checked);
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
          </label>
        </div>

        {/* Input Nama & Nomor Handphone / WhatsApp */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
          {!isAnonymous && (
            <div>
              <label htmlFor="fullName" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1 sm:mb-2">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap (hanya huruf &amp; tanda)"
                className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-bold"
                required={!isAnonymous}
              />
            </div>
          )}

          <div className={isAnonymous ? 'sm:col-span-2' : ''}>
            <div className="flex items-center justify-between mb-1 sm:mb-2">
              <label htmlFor="phone" className="block text-xs sm:text-base font-extrabold text-slate-900">
                Nomor Handphone / WA <span className="text-rose-500">*</span>
              </label>
              {isPhoneValid && (
                <span className="text-[11px] font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Format Valid
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="Contoh: 081234567890 (10–13 digit)"
                className={`w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border text-slate-900 placeholder-slate-500 text-xs sm:text-base focus:outline-none font-bold pr-10 ${
                  isPhoneValid ? 'border-emerald-500 focus:border-emerald-600' : 'border-slate-300 focus:border-emerald-600'
                }`}
                required
              />
              <Phone className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Otomatis diformat (diawali 08, 10–13 digit).</p>
          </div>
        </div>

        {/* Input Spesifik Berdasarkan Kategori */}
        <div className="space-y-3.5 sm:space-y-4 pt-1">
          {(category === 'Saran' || category === 'Masukan' || category === 'Pengaduan') && (
            <div>
              <label htmlFor="subject" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1 sm:mb-2">
                {category === 'Saran' && <>Judul Usulan / Saran <span className="text-rose-500">*</span></>}
                {category === 'Masukan' && <>Subjek Masukan <span className="text-rose-500">*</span></>}
                {category === 'Pengaduan' && <>Judul Laporan Pengaduan <span className="text-rose-500">*</span></>}
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  category === 'Saran'
                    ? 'Contoh: Digitalisasi Layanan Legalisir Ijazah'
                    : category === 'Masukan'
                      ? 'Contoh: Peningkatan Kenyamanan Ruang Tunggu PTSP'
                      : 'Contoh: Dugaan Pungli Pencatatan Nikah di Luar KUA'
                }
                className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-bold"
                required
              />
            </div>
          )}

          {category === 'Pengaduan' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="eventDateSelector" className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2">
                  Tanggal Kejadian / Peristiwa <span className="text-slate-500 font-normal text-xs">(Opsional)</span>
                </label>
                <ModernDatePicker value={eventDate} onChange={(date) => setEventDate(date)} placeholder="Pilih tanggal peristiwa..." />
              </div>
              <div>
                <label htmlFor="eventLocation" className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2">
                  Lokasi Kejadian <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="eventLocation"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Contoh: KUA Kecamatan Teweh Tengah"
                  className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
                  required
                />
              </div>
            </div>
          )}

          {category === 'Keluhan' && (
            <div>
              <label htmlFor="officerName" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1 sm:mb-2">
                Nama Petugas / Oknum Terkait <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="officerName"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                placeholder="Tuliskan nama petugas atau deskripsi ciri-cirinya"
                className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-bold"
                required
              />
            </div>
          )}

          {category === 'Informasi' && (
            <div>
              <label htmlFor="infoPurpose" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1 sm:mb-2">
                Tujuan Penggunaan Informasi <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                id="infoPurpose"
                value={infoPurpose}
                onChange={(e) => setInfoPurpose(e.target.value)}
                placeholder="Contoh: Keperluan Riset Skripsi / Data Lembaga"
                className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-bold"
                required
              />
            </div>
          )}

          {/* Textarea Detail Uraian */}
          <div>
            <label htmlFor="content" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1 sm:mb-2">
              {category === 'Saran' && <>Detail Uraian Gagasan &amp; Solusi <span className="text-rose-500">*</span></>}
              {category === 'Masukan' && <>Uraian Pandangan &amp; Masukan Konstruktif <span className="text-rose-500">*</span></>}
              {category === 'Pengaduan' && <>Kronologi &amp; Detail Pengaduan <span className="text-rose-500">*</span></>}
              {category === 'Keluhan' && <>Uraian Keluhan Pelayanan <span className="text-rose-500">*</span></>}
              {category === 'Informasi' && <>Rincian Keterangan / Informasi yang Dibutuhkan <span className="text-rose-500">*</span></>}
              {category === 'Tanggapan' && <>Uraian Tanggapan &amp; Pandangan <span className="text-rose-500">*</span></>}
            </label>
            <textarea
              id="content"
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                category === 'Saran'
                  ? 'Uraikan ide, gagasan inovatif, dan langkah solusi perbaikan...'
                  : category === 'Masukan'
                    ? 'Tuliskan pandangan konstruktif atau saran evaluasi pelayanan...'
                    : category === 'Pengaduan'
                      ? 'Uraikan kronologi kejadian secara rinci, waktu, tempat, atau oknum yang terlibat...'
                      : category === 'Keluhan'
                        ? 'Ceritakan kendala atau pelayanan tidak memuaskan yang Anda alami...'
                        : category === 'Informasi'
                          ? 'Rincikan daftar informasi, data resmi, atau dokumen yang Anda minta...'
                          : 'Tuliskan tanggapan, respon, atau pandangan Anda atas kebijakan tersebut...'
              }
              className="w-full px-3.5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-medium"
              required
            />
          </div>

          {(category === 'Saran' || category === 'Masukan') && (
            <div>
              <label htmlFor="expectedImpact" className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2">
                Dampak / Manfaat yang Diharapkan <span className="text-slate-500 font-normal text-xs">(Opsional)</span>
              </label>
              <input
                type="text"
                id="expectedImpact"
                value={expectedImpact}
                onChange={(e) => setExpectedImpact(e.target.value)}
                placeholder="Contoh: Mempercepat waktu pelayanan publik dan efisiensi antrean"
                className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
              />
            </div>
          )}
        </div>

        {/* Upload Lampiran File Pendukung dengan Thumbnail Image Preview */}
        <div>
          <label htmlFor="attachment" className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-3 flex items-center justify-between">
            <span>
              Lampiran Berkas / Bukti Pendukung <span className="text-slate-500 font-normal text-xs">(Opsional)</span>
            </span>
            <span className="text-[11px] text-slate-500 font-normal">PNG, JPG, WEBP, PDF (Maks. 5MB)</span>
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
                validateAndSetFile(e.dataTransfer.files[0]);
              }
            }}
            className={`relative p-4 sm:p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
              fileErrorMsg
                ? 'border-rose-400 bg-rose-50/60 ring-2 ring-rose-500/20'
                : isDragging
                  ? 'border-emerald-600 bg-emerald-50/80 ring-4 ring-emerald-600/20 scale-[1.01]'
                  : attachment
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'
            }`}
          >
            <input
              type="file"
              id="attachment"
              aria-label="Upload berkas atau bukti pendukung"
              accept="image/png, image/jpeg, image/webp, application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  validateAndSetFile(e.target.files[0]);
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            {attachment ? (
              <div className="flex items-center gap-3.5 w-full text-left">
                {attachmentPreview ? (
                  <img
                    src={attachmentPreview}
                    alt="Preview Bukti"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-emerald-300 shrink-0 shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <FileText className="w-7 h-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold text-slate-900 truncate text-xs sm:text-sm">{attachment.name}</p>
                  <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
                    {(attachment.size / (1024 * 1024)).toFixed(2)} MB {'\u2022'} Klik atau tarik file lain untuk mengganti
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Hapus berkas lampiran"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveAttachment();
                  }}
                  className="p-2 rounded-xl hover:bg-rose-100 text-slate-500 hover:text-rose-600 transition-colors z-20 cursor-pointer shrink-0"
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
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    atau <span className="text-emerald-700 font-bold underline">pilih dari perangkat</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {fileErrorMsg && (
            <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-bold">{fileErrorMsg}</span>
            </div>
          )}
        </div>

        {/* Cloudflare Turnstile Captcha Widget */}
        <div className="flex justify-center my-3 sm:my-6 overflow-hidden">
          <Turnstile
            siteKey={TURNSTILE_SITE_KEY}
            onSuccess={(token) => setTurnstileToken(token)}
            onError={() => setTurnstileToken('')}
            options={{ theme: 'light' }}
          />
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          aria-label="Kirim Pengaduan Resmi"
          disabled={!isFormValid || isSubmitting}
          className={`w-full py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-lg flex items-center justify-center gap-3 transition-all cursor-pointer shadow-lg ${
            isFormValid && !isSubmitting
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-[0.99]'
              : 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none'
          }`}
        >
          <Send className={`w-5 h-5 ${isSubmitting ? 'animate-bounce' : ''}`} />
          <span>{isSubmitting ? 'Mengirim Pengaduan...' : 'Kirim Pengaduan Resmi'}</span>
        </button>
      </form>
    </div>
  );
}
