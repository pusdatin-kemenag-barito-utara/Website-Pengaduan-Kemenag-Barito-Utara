"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  submitPengaduanAction,
  checkTicketStatusAction,
  submitTicketRatingAction,
} from "./actions";
import { getLayananListAction } from "./pusdatin/auth/admin-actions";
import { Pengaduan, Layanan } from "@/lib/supabase";
import { Turnstile } from "@marsidev/react-turnstile";
import { QRCodeCanvas } from "qrcode.react";
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
  Star,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Copy,
  Clock,
  Check,
} from "lucide-react";

const CATEGORIES = [
  {
    id: "Saran",
    label: "Saran",
    icon: Sparkles,
    desc: "Usulan perbaikan layanan",
  },
  {
    id: "Masukan",
    label: "Masukan",
    icon: MessageSquare,
    desc: "Pandangan konstruktif",
  },
  {
    id: "Pengaduan",
    label: "Pengaduan",
    icon: AlertCircle,
    desc: "Laporan ketidaksesuaian",
  },
  {
    id: "Keluhan",
    label: "Keluhan",
    icon: ShieldAlert,
    desc: "Kekecewaan pelayanan",
  },
  {
    id: "Informasi",
    label: "Informasi",
    icon: Info,
    desc: "Permohonan keterangan",
  },
  {
    id: "Tanggapan",
    label: "Tanggapan",
    icon: MessageCircle,
    desc: "Respon kebijakan",
  },
];

interface ModernDatePickerProps {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
}

function ModernDatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal...",
}: ModernDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split("-").map(Number);
      return new Date(parts[0], parts[1] - 1, 1);
    }
    return new Date();
  });

  const MONTH_NAMES = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const formatDisplayDate = (valStr: string) => {
    if (!valStr) return "";
    const [y, m, d] = valStr.split("-").map(Number);
    if (!y || !m || !d) return "";
    return `${d < 10 ? "0" + d : d} ${MONTH_NAMES[m - 1]} ${y}`;
  };

  const handleSelectDate = (d: number) => {
    const monthFormatted = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    const dayFormatted = d < 10 ? `0${d}` : `${d}`;
    onChange(`${year}-${monthFormatted}-${dayFormatted}`);
    setIsOpen(false);
  };

  const handleSetToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m =
      today.getMonth() + 1 < 10
        ? `0${today.getMonth() + 1}`
        : `${today.getMonth() + 1}`;
    const d =
      today.getDate() < 10 ? `0${today.getDate()}` : `${today.getDate()}`;
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleSetYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m =
      yesterday.getMonth() + 1 < 10
        ? `0${yesterday.getMonth() + 1}`
        : `${yesterday.getMonth() + 1}`;
    const d =
      yesterday.getDate() < 10
        ? `0${yesterday.getDate()}`
        : `${yesterday.getDate()}`;
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const isToday = (d: number) => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === d
    );
  };

  const isSelected = (d: number) => {
    if (!value) return false;
    const [y, m, dayVal] = value.split("-").map(Number);
    return y === year && m === month + 1 && dayVal === d;
  };

  return (
    <div className="relative">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs ${
          isOpen
            ? "border-emerald-600 ring-4 ring-emerald-600/15 bg-white"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-100/70"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Calendar
            className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${value ? "text-emerald-600" : "text-slate-400"}`}
          />
          <span
            className={`text-xs sm:text-sm font-bold truncate ${value ? "text-slate-900" : "text-slate-400 font-medium"}`}
          >
            {value ? formatDisplayDate(value) : placeholder}
          </span>
        </div>
        {value ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            title="Kosongkan tanggal"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-emerald-600" : ""}`}
          />
        )}
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-2 z-40 p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xl shadow-slate-900/15 w-72 sm:w-80 space-y-4 animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header: Month & Year Selector */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-black text-xs sm:text-sm text-slate-900">
                {MONTH_NAMES[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black text-slate-400 uppercase">
              {DAY_NAMES.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const sel = isSelected(dayNum);
                const tod = isToday(dayNum);
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => handleSelectDate(dayNum)}
                    className={`h-8 sm:h-9 rounded-xl text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                      sel
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105"
                        : tod
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Quick Preset Buttons Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] font-bold">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSetToday}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={handleSetYesterday}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Kemarin
                </button>
              </div>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setIsOpen(false);
                  }}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface SubmittedDetails {
  ticket: string;
  category: string;
  serviceUnit: string;
  fullName: string;
  phone: string;
  isAnonymous: boolean;
  subject: string;
  content: string;
  attachmentName?: string;
  eventDate?: string;
  eventLocation?: string;
  status: string;
  createdAt: string;
}

export default function PublicPage() {
  // Form State
  const [category, setCategory] = useState<string>("Pengaduan");
  const [serviceUnitsList, setServiceUnitsList] = useState<string[]>([]);
  const [serviceUnit, setServiceUnit] = useState<string>("");
  const [isLayananLoading, setIsLayananLoading] = useState<boolean>(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  // Category-specific dynamic fields state
  const [subject, setSubject] = useState<string>("");
  const [eventDate, setEventDate] = useState<string>("");
  const [eventLocation, setEventLocation] = useState<string>("");
  const [officerName, setOfficerName] = useState<string>("");
  const [infoPurpose, setInfoPurpose] = useState<string>("");
  const [policyName, setPolicyName] = useState<string>("");
  const [expectedImpact, setExpectedImpact] = useState<string>("");

  const [content, setContent] = useState<string>("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [fileErrorMsg, setFileErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");

  // UI State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    ticket?: string;
  } | null>(null);
  const [submittedDetails, setSubmittedDetails] =
    useState<SubmittedDetails | null>(null);
  const [isCopiedTicket, setIsCopiedTicket] = useState<boolean>(false);

  // Floating Modal Lacak Tiket State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [searchTicket, setSearchTicket] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchCooldown, setSearchCooldown] = useState<number>(0); // detik cooldown UI
  const [ticketResult, setTicketResult] = useState<Pengaduan | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Rating & Ulasan State (Fitur 6)
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [userFeedback, setUserFeedback] = useState<string>("");
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [ratingMsg, setRatingMsg] = useState<string | null>(null);

  // 1. Load Dynamic Services 100% from Database/Admin
  useEffect(() => {
    async function loadDynamicLayanan() {
      setIsLayananLoading(true);
      const res = await getLayananListAction();
      setIsLayananLoading(false);

      if (res.success && res.data && res.data.length > 0) {
        const activeNames = res.data
          .filter((l: Layanan) => l.is_active !== false)
          .map((l: Layanan) => l.name);
        if (activeNames.length > 0) {
          setServiceUnitsList(activeNames);
        }
      }
    }
    loadDynamicLayanan();
  }, []);

  // 2. Auto-search ticket status if ?ticket=SGT-XXXX parameter is present in URL (e.g. from QR Code scan)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ticketParam = params.get("ticket");
      if (ticketParam) {
        const cleanTicket = ticketParam.trim().toUpperCase();
        const autoFetchTicket = async () => {
          setSearchTicket(cleanTicket);
          setIsSearchModalOpen(true);
          setIsSearching(true);
          setSearchError(null);
          const res = await checkTicketStatusAction(cleanTicket);
          setIsSearching(false);
          if (res.success && res.data) {
            setTicketResult(res.data);
            if (res.data.rating) setRatingVal(res.data.rating);
            if (res.data.user_feedback)
              setUserFeedback(res.data.user_feedback);
          } else {
            setSearchError(res.message || "Tiket tidak ditemukan.");
          }
        };
        autoFetchTicket();
      }
    }
  }, []);

  // 3. Lock background body scroll when any modal is active
  useEffect(() => {
    if (submittedDetails || isSearchModalOpen || isGuideModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [submittedDetails, isSearchModalOpen, isGuideModalOpen]);

  // Validasi Kelengkapan Form Wajib & Turnstile Token
  const isFormValid = (() => {
    if (!serviceUnit) return false;
    if (!phone || phone.length < 10) return false;
    if (!isAnonymous && !fullName.trim()) return false;
    if (!content.trim()) return false;

    if ((category === "Saran" || category === "Masukan" || category === "Pengaduan") && !subject.trim()) {
      return false;
    }
    if (category === "Pengaduan" && !eventLocation.trim()) {
      return false;
    }
    if (category === "Keluhan" && !officerName.trim()) {
      return false;
    }
    if (category === "Informasi" && !infoPurpose.trim()) {
      return false;
    }
    if (category === "Tanggapan" && !policyName.trim()) {
      return false;
    }

    if (!turnstileToken) return false;

    return true;
  })();

  // Helper untuk validasi file lampiran (Format & Maksimal 5MB)
  const validateAndSetFile = (file: File) => {
    setFileErrorMsg(null);

    const allowedTypes = ["image/png", "image/jpeg", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileErrorMsg("Format berkas tidak didukung! Harap pilih file PNG, JPG, atau PDF.");
      return false;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB limit
    if (file.size > MAX_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileErrorMsg(`Ukuran berkas terlalu besar (${sizeMB} MB)! Maksimal ukuran lampiran adalah 5 MB.`);
      return false;
    }

    setAttachment(file);
    return true;
  };

  const ticketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  // Bulletproof Native HTML5 2D Canvas Ticket Generator (0 CSS errors, Instant 4K PNG download)
  const handleDownloadTicket = async () => {
    if (!submittedDetails) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1500;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // 1. Background Fill & Outer Border
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1200, 1500);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, 1140, 1440);

      // 2. Kemenag KOP Header Box & Logo
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(60, 60, 1080, 8);

      const logoImg = new window.Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = "/kemenag.svg";
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, 70, 95, 100, 100);
      }

      ctx.fillStyle = "#334155";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("KEMENTERIAN AGAMA REPUBLIK INDONESIA", 190, 115);

      ctx.fillStyle = "#022c22";
      ctx.font = "900 24px sans-serif";
      ctx.fillText("KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA", 190, 150);

      ctx.fillStyle = "#334155";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan (SI-GESIT)", 190, 178);

      ctx.fillStyle = "#64748b";
      ctx.font = "13px sans-serif";
      ctx.fillText("Jl. Ahmad Yani No. 126 Muara Teweh, Kalimantan Tengah • Email: baritoutara@kemenag.go.id", 190, 202);

      // Double Line Rule
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(60, 220, 1080, 4);
      ctx.fillRect(60, 228, 1080, 1);

      // 3. Ticket Code Header Box
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.roundRect(60, 255, 1080, 190, 24);
      ctx.fill();

      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("NOMOR TIKET RESMI SI-GESIT", 95, 305);

      ctx.fillStyle = "#34d399";
      ctx.font = "900 44px monospace";
      ctx.fillText(submittedDetails.ticket, 95, 365);

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Status Laporan: ${submittedDetails.status}   •   Waktu Kirim: ${submittedDetails.createdAt}`, 95, 410);

      // Draw QR Code onto Canvas
      const qrCanvas = document.querySelector("canvas") as HTMLCanvasElement;
      if (qrCanvas) {
        try {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.roundRect(960, 280, 140, 140, 16);
          ctx.fill();
          ctx.drawImage(qrCanvas, 970, 290, 120, 120);
        } catch {}
      }

      // 4. Data Details Table Card
      ctx.fillStyle = "#64748b";
      ctx.font = "900 16px sans-serif";
      ctx.fillText("RINCIAN DATA PENGAJUAN MASYARAKAT", 60, 485);
      ctx.fillRect(60, 495, 1080, 2);

      const fields = [
        { label: "Kategori Laporan:", val: submittedDetails.category },
        { label: "Terkait Unit Layanan:", val: submittedDetails.serviceUnit },
        { label: "Nama Pelapor / Pengadu:", val: submittedDetails.isAnonymous ? "Anonim (Identitas Disembunyikan)" : submittedDetails.fullName },
        { label: "Nomor WhatsApp / HP:", val: submittedDetails.phone },
        ...(submittedDetails.eventDate ? [{ label: "Tanggal Kejadian:", val: submittedDetails.eventDate }] : []),
        ...(submittedDetails.attachmentName ? [{ label: "Lampiran Berkas:", val: submittedDetails.attachmentName }] : []),
      ];

      let currentY = 535;
      fields.forEach((f) => {
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(f.label, 60, currentY);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 17px sans-serif";
        ctx.fillText(f.val, 340, currentY);

        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(60, currentY + 15, 1080, 1);
        currentY += 50;
      });

      // 5. Uraian Text Box
      currentY += 20;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(60, currentY, 1080, 240, 20);
      ctx.fill();

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("ISI URAIAN & CATATAN PENGAJUAN:", 85, currentY + 35);

      ctx.fillStyle = "#0f172a";
      ctx.font = "15px sans-serif";

      const lines = submittedDetails.content.split("\n");
      let lineY = currentY + 70;
      for (let l = 0; l < lines.length && lineY < currentY + 220; l++) {
        const words = lines[l].split(" ");
        let line = "";
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 1000 && n > 0) {
            ctx.fillText(line, 85, lineY);
            line = words[n] + " ";
            lineY += 24;
            if (lineY > currentY + 215) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 85, lineY);
        lineY += 24;
      }

      // 6. Verification Footer
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(60, 1380, 1080, 2);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("SI-GESIT • Kementerian Agama Kabupaten Barito Utara", 60, 1415);

      ctx.fillStyle = "#64748b";
      ctx.font = "13px sans-serif";
      ctx.fillText("Harap simpan bukti tiket ini untuk melakukan cek status penanganan secara online.", 60, 1438);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 13px monospace";
      ctx.fillText("DOKUMEN RESMI OTENTIK DIGITAL", 900, 1425);

      // 7. Direct PNG File Download Trigger
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Bukti_Tiket_${submittedDetails.ticket}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error generating ticket file:", err);
      alert("Gagal mengunduh berkas. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Download Searched Ticket Image directly via Native 2D Canvas
  const handleDownloadSearchedTicket = async (ticket: Pengaduan) => {
    if (!ticket) return;
    setIsDownloading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1500;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      // 1. Background Fill & Outer Border
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1200, 1500);

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 8;
      ctx.strokeRect(30, 30, 1140, 1440);

      // 2. Kemenag KOP Header Box & Logo
      ctx.fillStyle = "#064e3b";
      ctx.fillRect(60, 60, 1080, 8);

      const logoImg = new window.Image();
      logoImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = "/kemenag.svg";
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, 70, 95, 100, 100);
      }

      ctx.fillStyle = "#334155";
      ctx.font = "bold 18px sans-serif";
      ctx.fillText("KEMENTERIAN AGAMA REPUBLIK INDONESIA", 190, 115);

      ctx.fillStyle = "#022c22";
      ctx.font = "900 24px sans-serif";
      ctx.fillText("KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA", 190, 150);

      ctx.fillStyle = "#334155";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan (SI-GESIT)", 190, 178);

      ctx.fillStyle = "#64748b";
      ctx.font = "13px sans-serif";
      ctx.fillText("Jl. Ahmad Yani No. 126 Muara Teweh, Kalimantan Tengah • Email: baritoutara@kemenag.go.id", 190, 202);

      // Double Line Rule
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(60, 220, 1080, 4);
      ctx.fillRect(60, 228, 1080, 1);

      // 3. Ticket Code Header Box
      ctx.fillStyle = "#090d16";
      ctx.beginPath();
      ctx.roundRect(60, 255, 1080, 190, 24);
      ctx.fill();

      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("NOMOR TIKET RESMI SI-GESIT", 95, 305);

      ctx.fillStyle = "#34d399";
      ctx.font = "900 44px monospace";
      ctx.fillText(ticket.ticket_number, 95, 365);

      const createdAtStr = ticket.created_at
        ? new Date(ticket.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
        : "-";

      ctx.fillStyle = "#cbd5e1";
      ctx.font = "16px sans-serif";
      ctx.fillText(`Status Laporan: ${ticket.status}   •   Waktu Dibuat: ${createdAtStr}`, 95, 410);

      // 4. Data Details Table Card
      ctx.fillStyle = "#64748b";
      ctx.font = "900 16px sans-serif";
      ctx.fillText("RINCIAN DATA PENGAJUAN & STATUS PELACAKAN", 60, 485);
      ctx.fillRect(60, 495, 1080, 2);

      const fields = [
        { label: "Kategori Laporan:", val: ticket.category },
        { label: "Terkait Unit Layanan:", val: ticket.service_unit },
        { label: "Nama Pelapor / Pengadu:", val: ticket.is_anonymous ? "Anonim (Identitas Disembunyikan)" : (ticket.full_name || "Masyarakat") },
        { label: "Nomor WhatsApp / HP:", val: ticket.phone_number || "-" },
        { label: "Status Progres Penanganan:", val: ticket.status },
      ];

      let currentY = 535;
      fields.forEach((f) => {
        ctx.fillStyle = "#64748b";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(f.label, 60, currentY);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 17px sans-serif";
        ctx.fillText(f.val, 340, currentY);

        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(60, currentY + 15, 1080, 1);
        currentY += 50;
      });

      // 5. Uraian Text Box
      currentY += 20;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(60, currentY, 1080, 220, 20);
      ctx.fill();

      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("URAIAN ISI PENGAJUAN:", 85, currentY + 35);

      ctx.fillStyle = "#0f172a";
      ctx.font = "15px sans-serif";

      const lines = (ticket.content || "").split("\n");
      let lineY = currentY + 70;
      for (let l = 0; l < lines.length && lineY < currentY + 200; l++) {
        const words = lines[l].split(" ");
        let line = "";
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > 1000 && n > 0) {
            ctx.fillText(line, 85, lineY);
            line = words[n] + " ";
            lineY += 24;
            if (lineY > currentY + 195) break;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 85, lineY);
        lineY += 24;
      }

      // 6. Response Box if Admin responded
      if (ticket.admin_response) {
        currentY += 240;
        ctx.fillStyle = "#ecfdf5";
        ctx.beginPath();
        ctx.roundRect(60, currentY, 1080, 160, 20);
        ctx.fill();

        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#047857";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("JAWABAN & TANGGAPAN RESMI TIM PENGADUAN KEMENAG BARITO UTARA:", 85, currentY + 35);

        ctx.fillStyle = "#064e3b";
        ctx.font = "15px sans-serif";
        ctx.fillText(ticket.admin_response, 85, currentY + 75);
      }

      // 7. Verification Footer
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(60, 1380, 1080, 2);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      ctx.fillText("SI-GESIT • Kementerian Agama Kabupaten Barito Utara", 60, 1415);

      ctx.fillStyle = "#64748b";
      ctx.font = "13px sans-serif";
      ctx.fillText("Harap simpan bukti tiket ini untuk melakukan cek status penanganan secara online.", 60, 1438);

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 13px monospace";
      ctx.fillText("DOKUMEN RESMI OTENTIK DIGITAL", 900, 1425);

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `Bukti_Tiket_${ticket.ticket_number}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error downloading searched ticket:", err);
      alert("Gagal mengunduh berkas tiket. Silakan coba lagi.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!serviceUnit) {
      setSubmitResult({
        success: false,
        message: "Harap pilih unit layanan terlebih dahulu!",
      });
      return;
    }

    if (attachment && attachment.size > 5 * 1024 * 1024) {
      setSubmitResult({
        success: false,
        message: `Ukuran berkas lampiran (${(attachment.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas 5MB! Harap pilih file yang lebih kecil.`,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    // Format content based on chosen category
    let finalContent = content.trim();
    if (category === "Saran") {
      finalContent =
        `[JUDUL SARAN]: ${subject.trim()}\n\n[DETAIL URAIAN GAGASAN]: ${content.trim()}` +
        (expectedImpact.trim()
          ? `\n\n[DAMPAK/MANFAAT DIHARAPKAN]: ${expectedImpact.trim()}`
          : "");
    } else if (category === "Masukan") {
      finalContent =
        `[SUBJEK MASUKAN]: ${subject.trim()}\n\n[URAIAN MASUKAN KONSTRUKTIF]: ${content.trim()}` +
        (expectedImpact.trim()
          ? `\n\n[HARAPAN EVALUASI]: ${expectedImpact.trim()}`
          : "");
    } else if (category === "Pengaduan") {
      finalContent =
        `[JUDUL PENGADUAN]: ${subject.trim()}\n` +
        (eventDate ? `[TANGGAL KEJADIAN]: ${eventDate}\n` : "") +
        (eventLocation.trim()
          ? `[LOKASI KEJADIAN]: ${eventLocation.trim()}\n`
          : "") +
        `\n[KRONOLOGI & DETAIL PENGADUAN]: ${content.trim()}`;
    } else if (category === "Keluhan") {
      finalContent =
        `[JUDUL KELUHAN]: ${subject.trim()}\n` +
        (officerName.trim()
          ? `[PETUGAS/UNIT TERKAIT]: ${officerName.trim()}\n`
          : "") +
        `\n[URAIAN KELUHAN PELAYANAN]: ${content.trim()}`;
    } else if (category === "Informasi") {
      finalContent =
        `[SUBJEK INFORMASI]: ${subject.trim()}\n` +
        (infoPurpose.trim()
          ? `[TUJUAN PENGGUNAAN]: ${infoPurpose.trim()}\n`
          : "") +
        `\n[RINCIAN INFORMASI DIBUTUHKAN]: ${content.trim()}`;
    } else if (category === "Tanggapan") {
      finalContent = `[PROGRAM/KEBIJAKAN DITANGGAPI]: ${(policyName || subject).trim()}\n\n[URAIAN TANGGAPAN & RESPON]: ${content.trim()}`;
    }

    const formData = new FormData();
    formData.append("category", category);
    formData.append("service_unit", serviceUnit);
    formData.append("is_anonymous", isAnonymous ? "true" : "false");
    formData.append("full_name", fullName);
    formData.append("phone_number", phone);
    formData.append("content", finalContent);
    formData.append("cf-turnstile-response", turnstileToken);
    if (attachment) {
      formData.append("attachment", attachment);
    }

    const res = await submitPengaduanAction(formData);
    setIsSubmitting(false);

    if (res.success) {
      setSubmitResult({
        success: true,
        message: res.message,
        ticket: res.ticket_number,
      });

      // Populate Floating Modal Success Notification State
      setSubmittedDetails({
        ticket: res.ticket_number!,
        category,
        serviceUnit,
        fullName: isAnonymous ? "Anonim" : fullName,
        phone,
        isAnonymous,
        subject: subject || category,
        content: finalContent,
        attachmentName: attachment?.name,
        eventDate,
        eventLocation,
        status: "Menunggu Diproses",
        createdAt: new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      // Reset form
      setFullName("");
      setPhone("");
      setContent("");
      setSubject("");
      setEventDate("");
      setEventLocation("");
      setOfficerName("");
      setInfoPurpose("");
      setPolicyName("");
      setExpectedImpact("");
      setAttachment(null);
      setServiceUnit("");
      setIsAnonymous(false);
      setTurnstileToken("");
    } else {
      setSubmitResult({
        success: false,
        message: res.message || "Gagal mengirim pengaduan. Silakan coba lagi.",
      });
    }
  };

  const handleSearchTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTicket.trim()) return;

    // Client-side: format pre-validation sebelum hit server
    const ticketFormatRegex = /^SGT-\d{8}-\d{1,6}$/i;
    if (!ticketFormatRegex.test(searchTicket.trim())) {
      setSearchError('Format nomor tiket tidak valid. Gunakan format: SGT-YYYYMMDD-XXXX');
      return;
    }

    // Cooldown aktif? Blokir sampai habis
    if (searchCooldown > 0) return;

    setIsSearching(true);
    setSearchError(null);
    setTicketResult(null);
    setRatingMsg(null);

    // Kirim clientHint sederhana sebagai identifier untuk server-side rate limit
    const clientHint = typeof window !== 'undefined'
      ? btoa(navigator.userAgent.slice(0, 32) + screen.width).slice(0, 20)
      : 'unknown';

    const res = await checkTicketStatusAction(searchTicket, clientHint);
    setIsSearching(false);

    // Terapkan cooldown 3 detik setelah tiap pencarian (bukan hanya saat error)
    setSearchCooldown(3);
    const timer = setInterval(() => {
      setSearchCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);

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

    const res = await submitTicketRatingAction(
      ticketResult.ticket_number,
      ratingVal,
      userFeedback,
    );
    setIsSubmittingRating(false);

    if (res.success) {
      setRatingMsg("Terima kasih! Ulasan & Penilaian Anda telah tersimpan.");
      setTicketResult({
        ...ticketResult,
        rating: ratingVal,
        user_feedback: userFeedback,
      });
    } else {
      setRatingMsg(res.message || "Gagal mengirimkan ulasan.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-x-hidden">
      {/* Animated Hero Gradient Wave Banner (Kemenag Emerald Theme) */}
      <div className="absolute top-0 left-0 right-0 h-[280px] sm:h-[360px] md:h-[420px] bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 overflow-hidden pointer-events-none z-0 print:hidden">
        {/* Glowing Gradient Orbs with Pulsing Micro-animations */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-400/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-8 -right-20 w-[450px] h-[450px] bg-teal-300/25 rounded-full blur-3xl animate-pulse delay-700" />

        {/* Animated Wave SVG */}
        <svg
          className="absolute bottom-0 w-full h-16 sm:h-28 text-slate-50 fill-current opacity-95"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,192C960,203,1056,181,1152,160C1248,139,1344,117,1392,106.7L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>

      {/* Top Bar Header - Modern Glassmorphism Layout */}
      <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-8 md:px-12 py-2.5 sm:py-3.5 shadow-xs transition-all print:hidden">
        <div className="w-full flex items-center justify-between gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="p-1.5 sm:p-2 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-xs shrink-0 flex items-center justify-center">
              <Image
                src="/kemenag.svg"
                alt="Logo Kemenag"
                width={36}
                height={36}
                className="object-contain shrink-0 w-8 h-8 sm:w-10 sm:h-10 h-auto"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-black text-lg sm:text-2xl tracking-tight text-slate-900 leading-none">
                  SI-GESIT
                </h1>
                <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-extrabold shadow-2xs shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  Barito Utara
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block font-medium truncate mt-0.5">
                <span className="text-emerald-600 font-black">S</span>istem <span className="text-emerald-600 font-black">I</span>nformasi <span className="text-emerald-600 font-black">G</span>agasan, <span className="text-emerald-600 font-black">E</span>valuasi, <span className="text-emerald-600 font-black">S</span>aran, <span className="text-emerald-600 font-black">I</span>nformasi dan <span className="text-emerald-600 font-black">T</span>anggapan
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 text-white shrink-0" />
              <span className="hidden xs:inline sm:inline">Lacak Tiket</span>
              <span className="inline xs:hidden sm:hidden">Lacak</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Mobile Margins & Padding */}
      <main className="w-full px-3 sm:px-8 md:px-12 py-4 sm:py-10 md:py-14 flex-1 print:p-0 print:w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Mobile Guide Bar - Shown only on Mobile */}
          <div className="col-span-1 lg:hidden print:hidden">
            <div
              onClick={() => setIsGuideModalOpen(true)}
              className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-teal-50 border border-emerald-200/80 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-300 transition-all active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-extrabold text-sm border border-emerald-200 shadow-xs">
                  ?
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  Perhatikan Cara Menyampaikan Pengaduan Yang Baik dan Benar
                </span>
              </div>
              <span className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-extrabold shrink-0 flex items-center gap-1 shadow-sm transition-colors">
                Lihat Alur
              </span>
            </div>
          </div>

          {/* Left Panel - Illustration Banner (Natural Page Scrolling) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-4 print:hidden">
            <Image
              src="/pengaduan-v2.webp"
              alt="Layanan Pengaduan Kemenag Barito Utara"
              width={793}
              height={1983}
              className="w-full h-auto object-contain block rounded-2xl shadow-xs"
              priority
            />
          </div>

          {/* Right Panel - Main Complaint Form Card */}
          <section className="lg:col-span-8 xl:col-span-8 p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-white border border-slate-200 shadow-sm sm:shadow-md w-full print:border-none print:shadow-none">
            {/* Header Title */}
            <div className="mb-4 sm:mb-6 border-b border-slate-100 pb-3 sm:pb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-2.5 sm:gap-3 mb-1 sm:mb-2">
                <FileText className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600 shrink-0" />
                Form Input Pengaduan
              </h2>
              <p className="text-xs sm:text-sm md:text-base text-slate-600 font-medium leading-relaxed">
                Isi formulir dengan jelas dan lengkap. Dukungan penuh pengiriman
                secara Anonim dan lampiran berkas.
              </p>
            </div>

            {submitResult && (
              <div
                className={`mb-4 sm:mb-6 p-4 sm:p-5 rounded-2xl text-xs sm:text-base border flex flex-col sm:flex-row items-start justify-between gap-4 ${
                  submitResult.success
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                    : "bg-rose-50 border-rose-300 text-rose-950"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {submitResult.success ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-7 sm:h-7 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1 sm:space-y-2">
                    <p className="font-extrabold text-sm sm:text-lg">
                      {submitResult.message}
                    </p>
                    {submitResult.ticket && (
                      <p className="text-xs sm:text-base">
                        Nomor tiket Anda:{" "}
                        <span className="font-mono font-bold text-emerald-900 bg-white px-2.5 sm:px-4 py-1 rounded-lg border border-emerald-300 shadow-sm inline-block mt-1">
                          {submitResult.ticket}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Fitur 5: Tombol Download Bukti Tiket setelah Sukses */}
                {submitResult.success && submitResult.ticket && (
                  <button
                    type="button"
                    onClick={handleDownloadTicket}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>{isDownloading ? "Mengunduh..." : "Download Bukti Tiket"}</span>
                  </button>
                )}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-4 sm:space-y-6 w-full print:hidden"
            >
              {/* Kategori Selector - Responsive Grid */}
              <div>
                <label className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-2">
                  Pilih Kategori <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
                  {CATEGORIES.map((cat) => {
                    const IconComp = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between h-full min-w-0 ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-600 text-emerald-900 ring-2 ring-emerald-600/50 shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1 sm:mb-1.5 min-w-0">
                          <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate min-w-0">
                            {cat.label}
                          </span>
                          <IconComp
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isSelected ? "text-emerald-600" : "text-slate-400"}`}
                          />
                        </div>
                        <span className="text-[10px] sm:text-xs text-slate-500 leading-tight font-medium line-clamp-2">
                          {cat.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Terkait Layanan Apa - Custom Modern Picker Component */}
              <div>
                <label className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-2">
                  Terkait Layanan Apa <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl bg-slate-50 border text-left flex items-center justify-between transition-all duration-200 cursor-pointer shadow-xs ${
                      isDropdownOpen
                        ? "border-emerald-600 ring-4 ring-emerald-600/15 bg-white"
                        : "border-slate-300 hover:border-slate-400 hover:bg-slate-100/70"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span
                        className={`text-xs sm:text-sm md:text-base truncate ${serviceUnit ? "font-extrabold text-slate-900" : "font-medium text-slate-400"}`}
                      >
                        {serviceUnit || "-- Pilih Unit Layanan --"}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                        isDropdownOpen ? "rotate-180 text-emerald-600" : ""
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
                        {serviceUnitsList.length === 0 ? (
                          <div className="p-4 text-center text-xs font-bold text-slate-400">
                            {isLayananLoading
                              ? "Memuat opsi layanan..."
                              : "Belum ada opsi layanan terdaftar."}
                          </div>
                        ) : (
                          serviceUnitsList.map((unit) => {
                            const isSelected = serviceUnit === unit;
                            return (
                              <button
                                key={unit}
                                type="button"
                                onClick={() => {
                                  setServiceUnit(unit);
                                  setIsDropdownOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 rounded-xl text-left text-xs sm:text-sm font-bold flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className="truncate">{unit}</span>
                                {isSelected && (
                                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Custom Interactive Toggle Switch / Checkbox Component */}
              <div
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`p-3.5 sm:p-4.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 cursor-pointer select-none ${
                  isAnonymous
                    ? "bg-amber-500/10 border-amber-300/90 shadow-sm"
                    : "bg-slate-50 border-slate-200 hover:bg-slate-100/80"
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5">
                  <div
                    className={`p-2 sm:p-2.5 rounded-xl transition-colors ${
                      isAnonymous
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isAnonymous ? (
                      <UserX className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-base font-extrabold text-slate-900">
                      Kirim Sebagai Anonim
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight">
                      Identitas Anda disembunyikan dan tidak akan terlihat oleh
                      publik.
                    </p>
                  </div>
                </div>

                {/* Custom Animated Toggle Switch Button */}
                <div
                  className={`w-11 sm:w-13 h-6 sm:h-7 rounded-full p-0.5 transition-colors duration-300 flex items-center shrink-0 ${
                    isAnonymous ? "bg-amber-500" : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                      isAnonymous
                        ? "translate-x-5 sm:translate-x-6"
                        : "translate-x-0"
                    }`}
                  >
                    {isAnonymous && (
                      <Check className="w-3 h-3 text-amber-600" />
                    )}
                  </div>
                </div>
              </div>

              {/* Form Input Data Pemohon */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
                {/* Nama Lengkap */}
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                  >
                    Nama Lengkap{" "}
                    {!isAnonymous && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => {
                      const filtered = e.target.value.replace(
                        /[^a-zA-Z\s'.,`-]/g,
                        "",
                      );
                      setFullName(filtered);
                    }}
                    disabled={isAnonymous}
                    placeholder={
                      isAnonymous
                        ? "Disembunyikan (Anonim)"
                        : "Nama lengkap (hanya huruf & tanda)"
                    }
                    className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 disabled:opacity-50 disabled:bg-slate-100 font-bold"
                    required={!isAnonymous}
                  />
                </div>

                {/* Nomor Handphone / WA */}
                <div>
                  <label
                    htmlFor="phone"
                    className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                  >
                    Nomor Handphone / WA{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => {
                        const onlyNums = e.target.value.replace(/[^0-9]/g, "");
                        if (onlyNums.length <= 13) {
                          setPhone(onlyNums);
                        }
                      }}
                      minLength={10}
                      maxLength={13}
                      pattern="[0-9]{10,13}"
                      placeholder="Contoh: 081234567890 (10-13 angka)"
                      className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold pr-10"
                      required
                    />
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute right-3.5 sm:right-5 top-3 sm:top-4 pointer-events-none" />
                  </div>
                  <span className="text-[10px] sm:text-xs text-slate-400 mt-1 block font-medium">
                    Hanya angka (min 10 - maks 13 digit)
                  </span>
                </div>
              </div>

              {/* Input Spesifik Berdasarkan Kategori yang Dipilih */}
              <div className="space-y-4 pt-1">
                {/* Judul / Subjek / Topik */}
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                  >
                    {category === "Saran" && (
                      <>
                        Judul Usulan / Topik Saran{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Masukan" && (
                      <>
                        Subjek Masukan Konstruktif{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Pengaduan" && (
                      <>
                        Judul Laporan Pengaduan{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Keluhan" && (
                      <>
                        Judul Keluhan Pelayanan{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Informasi" && (
                      <>
                        Subjek / Topik Informasi yang Diminta{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Tanggapan" && (
                      <>
                        Program / Kebijakan yang Ditanggapi{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={
                      category === "Saran"
                        ? "Contoh: Usulan Penambahan Loket Pelayanan Sertifikasi Halal UMKM"
                        : category === "Masukan"
                          ? "Contoh: Masukan Kebersihan & Kenyamanan Ruang Tunggu PTSP"
                          : category === "Pengaduan"
                            ? "Contoh: Dugaan Pungli Pencatatan Nikah di Luar KUA"
                            : category === "Keluhan"
                              ? "Contoh: Antrean Online Pelayanan Mengalami Kendala"
                              : category === "Informasi"
                                ? "Contoh: Permohonan Data Sertifikasi Halal UMKM 2026"
                                : "Contoh: Tanggapan Atas Keputusan Menteri Agama No. 123"
                    }
                    className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
                    required
                  />
                </div>

                {/* Extra Fields for Pengaduan & Keluhan: Tanggal & Lokasi Kejadian */}
                {(category === "Pengaduan" || category === "Keluhan") && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6">
                    <div>
                      <label
                        htmlFor="eventDate"
                        className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                      >
                        Tanggal Kejadian / Peristiwa{" "}
                        <span className="text-slate-400 font-normal text-xs">
                          (Opsional)
                        </span>
                      </label>
                      <ModernDatePicker
                        value={eventDate}
                        onChange={setEventDate}
                        placeholder="Pilih tanggal kejadian..."
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="eventLocation"
                        className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                      >
                        {category === "Pengaduan" ? (
                          <>
                            Lokasi Kejadian{" "}
                            <span className="text-rose-500">*</span>
                          </>
                        ) : (
                          <>
                            Petugas / Unit Terkait{" "}
                            <span className="text-slate-400 font-normal text-xs">
                              (Opsional)
                            </span>
                          </>
                        )}
                      </label>
                      <input
                        type="text"
                        id="eventLocation"
                        value={
                          category === "Pengaduan" ? eventLocation : officerName
                        }
                        onChange={(e) =>
                          category === "Pengaduan"
                            ? setEventLocation(e.target.value)
                            : setOfficerName(e.target.value)
                        }
                        placeholder={
                          category === "Pengaduan"
                            ? "Contoh: KUA Kecamatan Murung / Kantor Kemenag"
                            : "Contoh: Loket 2 PTSP / Petugas Administrasi"
                        }
                        className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
                        required={category === "Pengaduan"}
                      />
                    </div>
                  </div>
                )}

                {/* Extra Field for Informasi: Tujuan Penggunaan */}
                {category === "Informasi" && (
                  <div>
                    <label
                      htmlFor="infoPurpose"
                      className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                    >
                      Tujuan Penggunaan Informasi{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="infoPurpose"
                      value={infoPurpose}
                      onChange={(e) => setInfoPurpose(e.target.value)}
                      placeholder="Contoh: Untuk Riset Penelitian Skripsi / Persyaratan Administrasi Usaha"
                      className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
                      required
                    />
                  </div>
                )}

                {/* Uraian Utama Textarea (Custom Label per Kategori) */}
                <div>
                  <label
                    htmlFor="content"
                    className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                  >
                    {category === "Saran" && (
                      <>
                        Detail Uraian Gagasan &amp; Solusi{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Masukan" && (
                      <>
                        Uraian Pandangan &amp; Masukan Konstruktif{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Pengaduan" && (
                      <>
                        Kronologi &amp; Detail Pengaduan{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Keluhan" && (
                      <>
                        Uraian Keluhan Pelayanan{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Informasi" && (
                      <>
                        Rincian Keterangan / Informasi yang Dibutuhkan{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                    {category === "Tanggapan" && (
                      <>
                        Uraian Tanggapan &amp; Pandangan{" "}
                        <span className="text-rose-500">*</span>
                      </>
                    )}
                  </label>
                  <textarea
                    id="content"
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      category === "Saran"
                        ? "Uraikan ide, gagasan inovatif, dan langkah solusi perbaikan..."
                        : category === "Masukan"
                          ? "Tuliskan pandangan konstruktif atau saran evaluasi pelayanan..."
                          : category === "Pengaduan"
                            ? "Uraikan kronologi kejadian secara rinci, waktu, tempat, atau oknum yang terlibat..."
                            : category === "Keluhan"
                              ? "Ceritakan kendala atau pelayanan tidak memuaskan yang Anda alami..."
                              : category === "Informasi"
                                ? "Rincikan daftar informasi, data resmi, atau dokumen yang Anda minta..."
                                : "Tuliskan tanggapan, respon, atau pandangan Anda atas kebijakan tersebut..."
                    }
                    className="w-full px-3.5 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-base focus:outline-none focus:border-emerald-600 font-medium"
                    required
                  />
                </div>

                {/* Extra Field for Saran / Masukan: Dampak yang Diharapkan */}
                {(category === "Saran" || category === "Masukan") && (
                  <div>
                    <label
                      htmlFor="expectedImpact"
                      className="block text-xs sm:text-sm font-extrabold text-slate-900 mb-1 sm:mb-2"
                    >
                      Dampak / Manfaat yang Diharapkan{" "}
                      <span className="text-slate-400 font-normal text-xs">
                        (Opsional)
                      </span>
                    </label>
                    <input
                      type="text"
                      id="expectedImpact"
                      value={expectedImpact}
                      onChange={(e) => setExpectedImpact(e.target.value)}
                      placeholder="Contoh: Mempercepat waktu pelayanan publik dan efisiensi antrean"
                      className="w-full px-3.5 sm:px-5 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-emerald-600 font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Fitur 1: Upload Lampiran File Pendukung (Opsional dengan Drag & Drop) */}
              <div>
                <label
                  htmlFor="attachment"
                  className="block text-xs sm:text-base font-extrabold text-slate-900 mb-1.5 sm:mb-3 flex items-center justify-between"
                >
                  <span>
                    Lampiran Berkas / Bukti Pendukung{" "}
                    <span className="text-slate-400 font-normal text-xs">
                      (Opsional)
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    PNG, JPG, PDF (Maks. 5MB)
                  </span>
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
                  className={`relative p-5 sm:p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    fileErrorMsg
                      ? "border-rose-400 bg-rose-50/60 ring-2 ring-rose-500/20"
                      : isDragging
                        ? "border-emerald-600 bg-emerald-50/80 ring-4 ring-emerald-600/20 scale-[1.01]"
                        : attachment
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400"
                  }`}
                >
                  <input
                    type="file"
                    id="attachment"
                    accept="image/png, image/jpeg, application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        validateAndSetFile(e.target.files[0]);
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
                        <p className="font-extrabold text-slate-900 truncate max-w-xs">
                          {attachment.name}
                        </p>
                        <p className="text-[10px] text-emerald-700 font-semibold">
                          {(attachment.size / (1024 * 1024)).toFixed(2)} MB •
                          Klik atau tarik file lain untuk mengganti
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachment(null);
                          setFileErrorMsg(null);
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
                          {isDragging
                            ? "Lepaskan file di sini..."
                            : "Tarik & Lepaskan berkas di sini"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          atau{" "}
                          <span className="text-emerald-700 font-bold underline">
                            pilih dari perangkat
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                {/* File Error Notification Banner */}
                {fileErrorMsg && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2.5 animate-in fade-in-50 duration-200">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="text-xs font-bold">{fileErrorMsg}</span>
                  </div>
                )}
              </div>

              {/* Cloudflare Turnstile Captcha Widget */}
              <div className="flex justify-center my-3 sm:my-6 overflow-hidden">
                <Turnstile
                  siteKey={
                    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
                    "0x4AAAAAADR1O_LSp1lgc3km"
                  }
                  onSuccess={(token) => setTurnstileToken(token)}
                  options={{ theme: "light" }}
                />
              </div>

              {/* Helper Banner saat Form Belum Lengkap / Turnstile Pending */}
              {!isFormValid && (
                <div className="mb-3.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center gap-2 text-xs font-extrabold text-center animate-in fade-in-50 duration-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Lengkapi semua kolom wajib (*) &amp; selesaikan verifikasi Cloudflare Turnstile agar tombol Kirim aktif.</span>
                </div>
              )}

              {/* Tombol Kirim Form dengan Animated Gradient, Light Shimmer & Dynamic Text per Kategori */}
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid}
                className={`relative group w-full py-3.5 sm:py-5 px-4 sm:px-10 rounded-2xl sm:rounded-3xl text-sm sm:text-lg font-black transition-all duration-300 overflow-hidden border ${
                  !isFormValid
                    ? "bg-slate-200 border-slate-300 text-slate-400 opacity-70 cursor-not-allowed shadow-none"
                    : "bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-700 hover:from-emerald-700 hover:via-emerald-500 hover:to-teal-600 text-white shadow-xl shadow-emerald-700/30 hover:shadow-2xl hover:shadow-emerald-600/50 active:scale-[0.98] cursor-pointer border-emerald-400/30"
                }`}
              >
                {/* Animated Light Shimmer Overlay on Hover */}
                <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out pointer-events-none" />

                {/* Dynamic Content */}
                <div className="relative z-10 flex items-center justify-center gap-2.5 sm:gap-3.5">
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 sm:w-6 sm:h-6 border-3 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span className="animate-pulse">
                        Memproses Pengiriman...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="p-1.5 sm:p-2 rounded-xl bg-white/15 text-white shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300">
                        <Send className="w-4 h-4 sm:w-6 sm:h-6 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      <span className="tracking-tight sm:tracking-wide text-xs sm:text-lg leading-snug text-center">
                        {category === "Saran" && (
                          <>
                            Kirim Saran &amp; Gagasan{" "}
                            <span className="inline-block">SI-GESIT</span>
                          </>
                        )}
                        {category === "Masukan" && (
                          <>
                            Kirim Masukan Konstruktif{" "}
                            <span className="inline-block">SI-GESIT</span>
                          </>
                        )}
                        {category === "Pengaduan" && (
                          <>
                            Kirim Laporan Pengaduan{" "}
                            <span className="inline-block">SI-GESIT</span>
                          </>
                        )}
                        {category === "Keluhan" && (
                          <>
                            Kirim Keluhan Pelayanan{" "}
                            <span className="inline-block">SI-GESIT</span>
                          </>
                        )}
                        {category === "Informasi" && (
                          <>
                            Kirim Permohonan Informasi{" "}
                            <span className="inline-block">SI-GESIT</span>
                          </>
                        )}
                        {category === "Tanggapan" && (
                          <>
                            Kirim Tanggapan{" "}
                            <span className="inline-block">SI-GESIT</span>
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </button>
            </form>
          </section>
        </div>
      </main>

      {/* Floating Modal Lacak Status Tiket */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 transition-all animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-[90vw] lg:max-w-5xl xl:max-w-6xl bg-white rounded-3xl shadow-2xl shadow-slate-900/25 border border-slate-200/80 overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">

            {/* Header Strip */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-white/15 text-emerald-100 flex items-center justify-center shrink-0 border border-white/20">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Lacak Status Tiket SI-GESIT
                  </h3>
                  <p className="text-xs text-emerald-200/80 font-medium">
                    Pantau progres penanganan aspirasi &amp; pengaduan Anda secara real-time
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchError(null);
                  setTicketResult(null);
                  setRatingMsg(null);
                }}
                className="p-2 text-emerald-200 hover:text-white rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Search Bar Area */}
            <div className="px-6 sm:px-8 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <form onSubmit={handleSearchTicket} className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTicket}
                    onChange={(e) => setSearchTicket(e.target.value)}
                    placeholder="SGT-YYYYMMDD-XXXX"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 uppercase tracking-widest font-mono font-bold transition-all shadow-sm"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || searchCooldown > 0}
                  className={`px-6 py-3 rounded-xl text-white text-sm font-extrabold transition-all shadow-sm shrink-0 flex items-center justify-center gap-2 group ${
                    searchCooldown > 0
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-emerald-700 hover:bg-emerald-800 cursor-pointer disabled:opacity-50"
                  }`}
                >
                  {isSearching ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Mencari...</span>
                    </>
                  ) : searchCooldown > 0 ? (
                    <>
                      <Clock className="w-4 h-4 opacity-80" />
                      <span>Tunggu {searchCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 transition-transform group-hover:scale-110" />
                      <span>Cari Tiket</span>
                    </>
                  )}
                </button>
              </form>

              {searchError && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 font-semibold max-w-2xl mx-auto">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>

            {/* Main Content Area (scrollable) */}
            <div className="overflow-y-auto flex-1">
              {ticketResult ? (() => {
                const statusStr = (ticketResult.status || "").toLowerCase();
                const isSelesai = statusStr.includes("selesai");
                const isDitolak = statusStr.includes("tolak");
                const isDiproses = statusStr.includes("proses") || isSelesai;

                const statusColor = isSelesai
                  ? { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-500" }
                  : isDiproses
                    ? { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300", dot: "bg-cyan-500" }
                    : isDitolak
                      ? { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300", dot: "bg-rose-500" }
                      : { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", dot: "bg-amber-400" };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-5 min-h-0">

                    {/* LEFT COLUMN — Ticket Identity & Status (2 cols) */}
                    <div className="lg:col-span-2 p-6 sm:p-8 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/40 flex flex-col gap-6">

                      {/* Ticket Number Block */}
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1">Nomor Tiket</p>
                        <p className="font-mono text-xl sm:text-2xl font-black text-emerald-900 tracking-wide leading-tight break-all">
                          {ticketResult.ticket_number}
                        </p>
                        <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                          Dibuat: {ticketResult.created_at
                            ? new Date(ticketResult.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })
                            : "-"}
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2">Status Penanganan</p>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}>
                          <span className={`w-2 h-2 rounded-full ${statusColor.dot} ${isDiproses && !isSelesai ? "animate-pulse" : ""}`} />
                          {ticketResult.status}
                        </div>
                      </div>

                      {/* Progress Steps */}
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-3">Alur Progres</p>
                        <div className="flex flex-col gap-2">
                          {/* Step 1 */}
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-800">Laporan Terdaftar</p>
                              <p className="text-[10px] text-slate-400">Tersimpan di database SI-GESIT</p>
                            </div>
                          </div>

                          {/* Connector */}
                          <div className={`ml-3.5 w-0.5 h-4 ${isDiproses ? "bg-emerald-300" : "bg-slate-200"}`} />

                          {/* Step 2 */}
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isDiproses ? "bg-cyan-50 border-cyan-400" : "bg-slate-100 border-slate-300"}`}>
                              <Clock className={`w-3.5 h-3.5 ${isDiproses && !isSelesai ? "text-cyan-600 animate-spin" : isSelesai ? "text-emerald-600" : "text-slate-400"}`} />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${isDiproses ? "text-cyan-800" : "text-slate-400"}`}>Penelaahan & Verifikasi</p>
                              <p className="text-[10px] text-slate-400">{isDiproses ? "Sedang ditangani petugas" : "Menunggu antrian"}</p>
                            </div>
                          </div>

                          {/* Connector */}
                          <div className={`ml-3.5 w-0.5 h-4 ${isSelesai || isDitolak ? "bg-emerald-300" : "bg-slate-200"}`} />

                          {/* Step 3 */}
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelesai ? "bg-emerald-50 border-emerald-400" : isDitolak ? "bg-rose-50 border-rose-400" : "bg-slate-100 border-slate-300"}`}>
                              <Sparkles className={`w-3.5 h-3.5 ${isSelesai ? "text-emerald-600" : isDitolak ? "text-rose-600" : "text-slate-400"}`} />
                            </div>
                            <div>
                              <p className={`text-xs font-bold ${isSelesai ? "text-emerald-800" : isDitolak ? "text-rose-700" : "text-slate-400"}`}>
                                {isDitolak ? "Laporan Ditolak" : "Tanggapan Diberikan"}
                              </p>
                              <p className="text-[10px] text-slate-400">{isSelesai ? "Selesai direspon" : isDitolak ? "Laporan tidak dapat diproses" : "Belum ada tanggapan"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white rounded-xl border border-slate-200 p-3">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Kategori</p>
                          <p className="text-slate-900 font-extrabold">{ticketResult.category}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-3">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Pengirim</p>
                          <p className="text-slate-900 font-extrabold">{ticketResult.is_anonymous ? "Anonim" : ticketResult.full_name}</p>
                        </div>
                        <div className="bg-white rounded-xl border border-slate-200 p-3 col-span-2">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">Unit Layanan Terkait</p>
                          <p className="text-slate-900 font-extrabold">{ticketResult.service_unit}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 mt-auto">
                        <button
                          type="button"
                          onClick={() => handleDownloadSearchedTicket(ticketResult)}
                          disabled={isDownloading}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          <Download className="w-4 h-4 text-emerald-200" />
                          {isDownloading ? "Mengunduh..." : "Download Bukti Tiket (PNG)"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSearchTicket(new Event("submit") as unknown as React.FormEvent)}
                          disabled={isSearching}
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-slate-200"
                        >
                          <Clock className={`w-3.5 h-3.5 ${isSearching ? "animate-spin" : ""}`} />
                          {isSearching ? "Memperbarui..." : "Segarkan Status dari Database"}
                        </button>
                      </div>
                    </div>

                    {/* RIGHT COLUMN — Content & Response (3 cols) */}
                    <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto">

                      {/* Uraian Pengaduan */}
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-2">Uraian Isi Pengaduan</p>
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-medium max-h-52 overflow-y-auto">
                          {ticketResult.content}
                        </div>
                      </div>

                      {/* Lampiran */}
                      {ticketResult.file_url && (
                        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <Paperclip className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-sm font-bold text-slate-800">Lampiran Berkas Pendukung</span>
                          </div>
                          <a
                            href={ticketResult.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Unduh Berkas
                          </a>
                        </div>
                      )}

                      {/* Admin Response */}
                      {ticketResult.admin_response ? (
                        <div>
                          <p className="text-[11px] text-emerald-700 font-black uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Tanggapan Resmi TIM Pengaduan Kemenag Barito Utara
                          </p>
                          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-950 leading-relaxed whitespace-pre-wrap font-semibold">
                            {ticketResult.admin_response}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                          <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="font-medium">Laporan Anda sedang dalam antrian penanganan TIM Pengaduan Kemenag Barito Utara. Pantau terus perkembangan melalui halaman ini.</span>
                        </div>
                      )}

                      {/* Rating Form — only when selesai or admin_response */}
                      {(ticketResult.status === "Selesai" || ticketResult.admin_response) && (
                        <form onSubmit={handleRatingSubmit} className="pt-4 border-t border-slate-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              Nilai Kualitas Layanan
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setRatingVal(star)}
                                  className="p-1 hover:scale-110 transition-transform cursor-pointer"
                                >
                                  <Star className={`w-5 h-5 ${star <= ratingVal ? "text-amber-500 fill-amber-500" : "text-slate-300"}`} />
                                </button>
                              ))}
                            </div>
                          </div>

                          <textarea
                            rows={2}
                            value={userFeedback}
                            onChange={(e) => setUserFeedback(e.target.value)}
                            placeholder="Bagikan pengalaman Anda terkait kecepatan & kualitas respon petugas..."
                            className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-medium transition-all resize-none"
                          />

                          {ratingMsg && (
                            <p className="text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                              {ratingMsg}
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={isSubmittingRating}
                            className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            {isSubmittingRating ? "Menyimpan..." : "Kirim Ulasan Layanan"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })() : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <Search className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-black text-slate-700 text-base">Masukkan nomor tiket Anda</p>
                    <p className="text-slate-400 text-sm font-medium mt-1 max-w-sm">Masukkan kode tiket SI-GESIT (contoh: <span className="font-mono font-bold text-emerald-700">SGT-20260802-1001</span>) untuk melihat status penanganan laporan Anda.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Floating Modal Alur & Panduan Pengaduan (Mobile View - Clean Lightbox) */}
      {isGuideModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 transition-all animate-in fade-in duration-200 print:hidden"
          onClick={() => setIsGuideModalOpen(false)}
        >
          <div
            className="relative max-w-full max-h-[92vh] flex items-center justify-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tombol Tutup Floating */}
            <button
              onClick={() => setIsGuideModalOpen(false)}
              className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-20 w-10 h-10 rounded-full bg-slate-900/90 text-white hover:bg-slate-900 border border-white/30 flex items-center justify-center shadow-xl transition-all cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="overflow-y-auto max-h-[88vh] rounded-2xl">
              <Image
                src="/pengaduan-v2.webp"
                alt="Alur Pengaduan Kemenag Barito Utara"
                width={793}
                height={1983}
                className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Modal Success Notification setelah Sukses Kirim */}
      {submittedDetails && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-200 print:hidden overscroll-contain touch-none">
          <div className="relative w-full max-w-xl bg-white rounded-3xl sm:rounded-4xl shadow-2xl border border-slate-200/80 overflow-hidden my-auto max-h-[92vh] flex flex-col touch-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-7 text-white relative shrink-0">
              <button
                onClick={() => setSubmittedDetails(null)}
                className="absolute right-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-lg">
                  <CheckCircle2 className="w-7 h-7 sm:w-9 sm:h-9 text-emerald-300" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 text-[11px] sm:text-xs font-black border border-emerald-400/30 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Pengaduan Berhasil Terkirim
                  </span>
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight">
                    Detail Pengajuan &amp; Tiket
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-4 flex-1 text-slate-800">
              {/* Box Copy Nomor Tiket */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white shadow-xl flex items-center justify-between gap-3 border border-slate-800">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                    Nomor Tiket Resmi
                  </span>
                  <span className="font-mono text-base sm:text-2xl font-black text-emerald-400 tracking-wider break-all block">
                    {submittedDetails.ticket}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedDetails.ticket);
                    setIsCopiedTicket(true);
                    setTimeout(() => setIsCopiedTicket(false), 2500);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
                    isCopiedTicket
                      ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/40 scale-105"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  }`}
                >
                  {isCopiedTicket ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-300" />
                      <span>Salin Tiket</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status & Waktu Kirim Bar */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Status Laporan
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                    {submittedDetails.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Waktu Dikirim
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800 block leading-snug">
                    {submittedDetails.createdAt}
                  </span>
                </div>
              </div>

              {/* Rincian Grid Cards */}
              <div className="space-y-3 pt-1">
                <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  Rincian Form Pengajuan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs sm:text-sm">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">
                      Kategori Pengaduan
                    </span>
                    <span className="font-extrabold text-slate-900 block">
                      {submittedDetails.category}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/80">
                    <span className="text-[10px] font-extrabold text-emerald-700 block mb-0.5">
                      Terkait Unit Layanan
                    </span>
                    <span className="font-extrabold text-emerald-950 block">
                      {submittedDetails.serviceUnit}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">
                      Nama Pengadu
                    </span>
                    <span className="font-extrabold text-slate-900 block">
                      {submittedDetails.isAnonymous
                        ? "Anonim (Disembunyikan)"
                        : submittedDetails.fullName}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">
                      No. WhatsApp / HP
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 block">
                      {submittedDetails.phone}
                    </span>
                  </div>

                  {submittedDetails.eventDate && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">
                        Tanggal Kejadian
                      </span>
                      <span className="font-extrabold text-slate-900 block">
                        {submittedDetails.eventDate}
                      </span>
                    </div>
                  )}

                  {submittedDetails.attachmentName && (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[10px] font-extrabold text-slate-400 block mb-0.5">
                        Lampiran Berkas
                      </span>
                      <span className="font-extrabold text-emerald-700 truncate block">
                        {submittedDetails.attachmentName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Box Uraian Content */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-extrabold text-slate-400 block mb-1.5 uppercase tracking-wider">
                    Isi Uraian &amp; Catatan Pengajuan:
                  </span>
                  <div className="text-xs sm:text-sm text-slate-800 font-medium whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto pr-2">
                    {submittedDetails.content}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTicket}
                disabled={isDownloading}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-700/20 active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-200" />
                <span>{isDownloading ? "Mengunduh..." : "Download Bukti Tiket"}</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmittedDetails(null)}
                className="w-full sm:flex-1 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
              >
                <span>Tutup &amp; Kirim Pengaduan Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Official Ticket Document Layout for Direct Download */}
      {submittedDetails && (
        <div
          ref={ticketRef}
          style={{ backgroundColor: '#ffffff', color: '#0f172a', padding: '32px', fontFamily: 'sans-serif' }}
          className="hidden print:block fixed inset-0 z-[9999] leading-relaxed"
        >
          {/* Authentic Kemenag KOP Surat Header */}
          <div style={{ borderBottom: '4px solid #0f172a', paddingBottom: '8px', marginBottom: '24px' }}>
            <div className="flex items-center justify-between gap-4 pb-3">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 relative shrink-0">
                  <Image
                    src="/kemenag.svg"
                    alt="Logo Kemenag"
                    width={64}
                    height={64}
                    className="object-contain"
                    priority
                  />
                </div>
                <div>
                  <h2 style={{ color: '#334155' }} className="text-xs font-bold tracking-wider uppercase">KEMENTERIAN AGAMA REPUBLIK INDONESIA</h2>
                  <h1 style={{ color: '#022c22' }} className="text-base sm:text-lg font-black uppercase tracking-tight leading-tight">KANTOR KEMENTERIAN AGAMA KABUPATEN BARITO UTARA</h1>
                  <p style={{ color: '#334155' }} className="text-[11px] font-bold mt-0.5">Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan (SI-GESIT)</p>
                  <p style={{ color: '#64748b' }} className="text-[10px] font-medium">Jl. Ahmad Yani No. 126 Muara Teweh, Kalimantan Tengah • Email: baritoutara@kemenag.go.id</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span style={{ backgroundColor: '#d1fae5', color: '#064e3b', borderColor: '#34d399' }} className="inline-block px-3.5 py-1 text-xs font-black rounded-full border">
                  BUKTI TIKET RESMI
                </span>
              </div>
            </div>
            {/* Double Rule Line under KOP */}
            <div style={{ borderBottom: '1px solid #0f172a', paddingTop: '2px' }} />
          </div>

          {/* Ticket Code Box Header */}
          <div style={{ backgroundColor: '#090d16', color: '#ffffff', borderColor: '#059669', padding: '24px', borderRadius: '24px' }} className="mb-6 flex items-center justify-between border-2 shadow-xl">
            <div className="space-y-1">
              <span style={{ color: '#94a3b8' }} className="text-xs font-bold uppercase tracking-wider block">
                NOMOR TIKET RESMI SI-GESIT
              </span>
              <span style={{ color: '#34d399' }} className="font-mono text-3xl font-black tracking-widest block">
                {submittedDetails.ticket}
              </span>
              <p style={{ color: '#cbd5e1' }} className="text-xs font-medium pt-1">
                Status Laporan:{" "}
                <strong style={{ color: '#fbbf24' }} className="font-bold">
                  {submittedDetails.status}
                </strong>{" "}
                &nbsp;•&nbsp; Waktu Kirim: {submittedDetails.createdAt}
              </p>
            </div>
            <div style={{ backgroundColor: '#ffffff', padding: '10px', borderRadius: '16px' }} className="shrink-0 shadow-md flex flex-col items-center">
              <QRCodeCanvas
                value={typeof window !== 'undefined' ? `${window.location.origin}/?ticket=${submittedDetails.ticket}` : `https://pengaduan.kemenag-baritoutara.com/?ticket=${submittedDetails.ticket}`}
                size={95}
                level="H"
              />
              <span style={{ color: '#64748b' }} className="text-[9px] font-bold mt-1 uppercase tracking-tighter">Pindai Cek Status</span>
            </div>
          </div>

          {/* Form Detail Table */}
          <div className="space-y-4 text-xs mb-8">
            <h3 style={{ color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }} className="text-xs font-black uppercase tracking-wider">
              Rincian Data Pengajuan Masyarakat
            </h3>

            <table className="w-full text-left border-collapse">
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold w-48">
                    Kategori Laporan:
                  </td>
                  <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-extrabold text-sm">
                    {submittedDetails.category}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                    Terkait Unit Layanan:
                  </td>
                  <td style={{ color: '#022c22', padding: '12px 0' }} className="font-extrabold text-sm">
                    {submittedDetails.serviceUnit}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                    Nama Pelapor / Pengadu:
                  </td>
                  <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-extrabold text-sm">
                    {submittedDetails.isAnonymous
                      ? "Anonim (Identitas Disembunyikan)"
                      : submittedDetails.fullName}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                    Nomor WhatsApp / HP:
                  </td>
                  <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-mono font-extrabold text-sm">
                    {submittedDetails.phone}
                  </td>
                </tr>
                {submittedDetails.eventDate && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                      Tanggal Kejadian:
                    </td>
                    <td style={{ color: '#0f172a', padding: '12px 0' }} className="font-extrabold text-sm">
                      {submittedDetails.eventDate}
                    </td>
                  </tr>
                )}
                {submittedDetails.attachmentName && (
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ color: '#64748b', padding: '12px 0' }} className="font-bold">
                      Lampiran Berkas Pendukung:
                    </td>
                    <td style={{ color: '#065f46', padding: '12px 0' }} className="font-extrabold text-sm">
                      {submittedDetails.attachmentName}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Uraian Text Box */}
            <div style={{ backgroundColor: '#f8fafc', borderColor: '#cbd5e1', padding: '20px', borderRadius: '16px' }} className="border mt-4">
              <span style={{ color: '#94a3b8' }} className="text-[11px] font-extrabold block mb-2 uppercase tracking-wider">
                Isi Uraian &amp; Catatan Pengajuan:
              </span>
              <div style={{ color: '#0f172a' }} className="text-xs font-medium whitespace-pre-wrap leading-relaxed">
                {submittedDetails.content}
              </div>
            </div>
          </div>

          {/* Official Verification Footer */}
          <div style={{ borderTop: '2px dashed #94a3b8', paddingTop: '16px' }} className="mt-12 flex items-center justify-between text-[11px]">
            <div>
              <p style={{ color: '#0f172a' }} className="font-extrabold">
                SI-GESIT • Kementerian Agama Kabupaten Barito Utara
              </p>
              <p style={{ color: '#64748b' }} className="text-[10px]">
                Harap simpan bukti fisik / PDF nomor tiket ini untuk melakukan
                cek status penanganan secara online.
              </p>
            </div>
            <div style={{ color: '#94a3b8' }} className="text-right font-mono font-extrabold text-[10px]">
              DOKUMEN RESMI OTENTIK DIGITAL
            </div>
          </div>
        </div>
      )}

      {/* Footer - Light Theme Mobile Friendly */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 sm:py-6 text-center text-xs text-slate-500 px-4 sm:px-8 print:hidden">
        <div className="w-full flex items-center justify-center font-medium">
          <p>
            © {new Date().getFullYear()} SI-GESIT - Kementerian Agama Kabupaten
            Barito Utara.
          </p>
        </div>
      </footer>
    </div>
  );
}
