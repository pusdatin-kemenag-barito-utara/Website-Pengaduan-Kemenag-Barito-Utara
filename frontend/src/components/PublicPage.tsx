import { useCallback, useEffect, useRef, useState } from 'react';
import { getLayananList, checkTicketStatus, getAppStatus } from '../lib/api';
import type { Layanan, TrackResult } from '../lib/api';
import { generateTicketPng } from '../lib/ticketCanvas';
import Header from './public/Header';
import GuideModal from './public/GuideModal';
import SearchTicketModal from './public/SearchTicketModal';
import SuccessModal from './public/SuccessModal';
import PrintableTicket from './public/PrintableTicket';
import ComplaintForm from './public/ComplaintForm';
import { Clock, MapPin, MessageCircle, ShieldCheck } from 'lucide-react';
import type { SubmittedDetails } from './public/types';
import { QRCodeCanvas } from 'qrcode.react';
import { analytics } from '../lib/analytics';

export default function PublicPage() {
  // Service List State — 100% Dinamis dari Database
  const [serviceUnitsList, setServiceUnitsList] = useState<Layanan[]>([]);
  const [isLayananLoading, setIsLayananLoading] = useState<boolean>(true);

  // Success Submitted Ticket State
  const [submittedDetails, setSubmittedDetails] = useState<SubmittedDetails | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Floating Modal Lacak Tiket State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [searchTicket, setSearchTicket] = useState<string>('');
  const [ticketResult, setTicketResult] = useState<TrackResult | null>(null);

  // Rating State
  const [ratingVal, setRatingVal] = useState<number>(5);
  const [userFeedback, setUserFeedback] = useState<string>('');

  // Download & Canvas References
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  const qrFormRef = useRef<HTMLDivElement>(null);
  const qrSearchRef = useRef<HTMLDivElement>(null);

  // 0. Auto-redirect to /maintenance if system is in maintenance mode
  useEffect(() => {
    let active = true;
    getAppStatus()
      .then((status) => {
        if (active && (status.is_maintenance || status.status === 'maintenance')) {
          window.location.replace('/maintenance');
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // 1. Load Dynamic Services 100% from Database/Admin
  const fetchLayanan = useCallback(async () => {
    setIsLayananLoading(true);
    try {
      const list = await getLayananList();
      setServiceUnitsList(list.filter((l) => l.is_active !== false));
    } catch (err) {
      console.error('Gagal memuat unit layanan dari database:', err);
    } finally {
      setIsLayananLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLayanan();

    const handleLayananUpdate = () => {
      void fetchLayanan();
    };

    window.addEventListener('layanan:updated', handleLayananUpdate);
    window.addEventListener('focus', handleLayananUpdate);
    return () => {
      window.removeEventListener('layanan:updated', handleLayananUpdate);
      window.removeEventListener('focus', handleLayananUpdate);
    };
  }, [fetchLayanan]);

  // 2. Auto-search ticket status if ?ticket=SGT-XXXX parameter is present (e.g. from QR Code scan)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticketParam = params.get('ticket');
    if (ticketParam) {
      const cleanTicket = ticketParam.trim().toUpperCase();
      const autoFetchTicket = async () => {
        setSearchTicket(cleanTicket);
        setIsSearchModalOpen(true);
        try {
          const data = await checkTicketStatus(cleanTicket);
          setTicketResult(data);
          if (data.rating) setRatingVal(data.rating);
          if (data.user_feedback) setUserFeedback(data.user_feedback);
        } catch {
          // Kesalahan pencarian akan ditampilkan di SearchTicketModal
        }
      };
      void autoFetchTicket();
    }
  }, []);

  // 3. Lock background body scroll when any modal is active
  useEffect(() => {
    if (submittedDetails || isSearchModalOpen || isGuideModalOpen) {
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
  }, [submittedDetails, isSearchModalOpen, isGuideModalOpen]);

  const handleDownloadTicket = async () => {
    if (!submittedDetails) return;
    setIsDownloading(true);
    try {
      await generateTicketPng(submittedDetails, qrFormRef.current);
      analytics.downloadTicketProof(submittedDetails.ticket);
    } catch (err) {
      console.error('Error generating ticket file:', err);
      alert('Gagal mengunduh berkas. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSearchedTicket = async (ticket: TrackResult) => {
    setIsDownloading(true);
    try {
      await generateTicketPng(
        {
          ticket: ticket.ticket_number,
          category: ticket.category,
          serviceUnit: ticket.service_unit,
          fullName: ticket.full_name || 'Anonim',
          phone: ticket.phone_hint,
          isAnonymous: ticket.is_anonymous,
          content: ticket.content,
          attachmentName: ticket.file_url ? 'Tersedia' : undefined,
          status: ticket.status,
          createdAt: new Date(ticket.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
        },
        qrSearchRef.current,
      );
      analytics.downloadTicketProof(ticket.ticket_number);
    } catch (err) {
      console.error('Error generating ticket file:', err);
      alert('Gagal mengunduh berkas. Silakan coba lagi.');
    } finally {
      setIsDownloading(false);
    }
  };

  const qrValue = submittedDetails
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?ticket=${encodeURIComponent(submittedDetails.ticket)}`
    : 'https://pengaduan.kemenag-baritoutara.com';

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-emerald-50/70 via-slate-50 to-slate-100 text-slate-800 flex flex-col font-sans print:bg-white">
      {/* Top Navbar Header */}
      <Header onOpenSearch={() => setIsSearchModalOpen(true)} />

      {/* Main Content Area */}
      <main className="w-full px-3 sm:px-8 md:px-12 py-4 sm:py-10 md:py-14 flex-1 print:p-0 print:w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Mobile Guide Bar */}
          <div className="col-span-1 lg:hidden print:hidden">
            <div
              onClick={() => {
                setIsGuideModalOpen(true);
                analytics.openGuideModal();
              }}
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

          {/* Left Panel - Illustration Banner */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-4 print:hidden">
            <img
              src="/pengaduan-v2.webp"
              alt="Layanan Pengaduan Kemenag Barito Utara"
              width="540"
              height="720"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto object-contain block rounded-3xl shadow-lg border border-emerald-100/80"
            />
          </div>

          {/* Right Panel - Main Complaint Form Card */}
          <ComplaintForm
            serviceUnitsList={serviceUnitsList}
            isLayananLoading={isLayananLoading}
            onSuccessSubmit={(details) => {
              setSubmittedDetails(details);
              setIsSuccessModalOpen(true);
            }}
            onDownloadTicket={handleDownloadTicket}
            isDownloading={isDownloading}
            onRetryLayanan={fetchLayanan}
          />
        </div>

        {/* Bottom Information & Helpdesk Section */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 print:hidden">
          {/* Card 1: Jam Pelayanan & Alamat */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0 border border-emerald-100 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Jam Pelayanan PTSP</h4>
              <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                Senin – Kamis: <strong>07.30 – 16.00 WIB</strong><br />
                Jumat: <strong>07.30 – 16.30 WIB</strong>
              </p>
              <p className="text-[11px] text-slate-600 mt-2 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Jl. Ahmad Yani No. 126 Muara Teweh</span>
              </p>
            </div>
          </div>

          {/* Card 2: Helpdesk WhatsApp */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white shadow-xl flex flex-col justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-white/15 backdrop-blur-md shrink-0">
                <MessageCircle className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight text-white">Konsultasi / Bantuan</h4>
                <p className="text-[11px] text-emerald-100 font-semibold">Petugas Helpdesk PTSP Kemenag</p>
              </div>
            </div>

            <a
              href="https://wa.me/6285117491212?text=Halo%20Admin%20SI-GESIT%20Kemenag%20Barito%20Utara%2C%20saya%20membutuhkan%20informasi%20dan%20panduan%20pengaduan."
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat ke WhatsApp Helpdesk PTSP Kemenag Barito Utara"
              onClick={() => analytics.helpdeskWhatsAppClick()}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>Chat WhatsApp Helpdesk</span>
            </a>
          </div>

          {/* Card 3: Jaminan Kerahasiaan */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-md flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 shrink-0 border border-emerald-100 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Jaminan Kerahasiaan</h4>
              <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                Identitas pelapor dijamin aman dan dilindungi penuh oleh <strong>UU No. 25 Tahun 2009</strong> tentang Pelayanan Publik serta enkripsi data.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Modal Lacak Status Tiket */}
      <SearchTicketModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false);
          setTicketResult(null);
        }}
        searchTicket={searchTicket}
        setSearchTicket={setSearchTicket}
        ticketResult={ticketResult}
        setTicketResult={setTicketResult}
        ratingVal={ratingVal}
        setRatingVal={setRatingVal}
        userFeedback={userFeedback}
        setUserFeedback={setUserFeedback}
        onDownloadTicket={handleDownloadSearchedTicket}
        isDownloading={isDownloading}
        qrSearchRef={qrSearchRef}
      />

      {/* Floating Modal Alur & Panduan Pengaduan */}
      <GuideModal isOpen={isGuideModalOpen} onClose={() => setIsGuideModalOpen(false)} />

      {/* Floating Modal Success Notification setelah Sukses Kirim */}
      <SuccessModal
        details={isSuccessModalOpen ? submittedDetails : null}
        onClose={() => setIsSuccessModalOpen(false)}
        onDownloadTicket={handleDownloadTicket}
        isDownloading={isDownloading}
      />

      {/* QR Code Canvas Ref untuk Form Submit */}
      {submittedDetails && (
        <div ref={qrFormRef} className="absolute -left-[9999px] -top-[9999px] pointer-events-none opacity-0" aria-hidden="true">
          <QRCodeCanvas value={qrValue} size={120} level="H" />
        </div>
      )}

      {/* Official Ticket Document Layout for Direct Print */}
      <PrintableTicket details={submittedDetails} ticketRef={ticketRef} qrValue={qrValue} />

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 sm:py-6 text-center text-xs text-slate-500 px-4 sm:px-8 print:hidden">
        <div className="w-full flex items-center justify-center font-medium">
          <p>&copy; {new Date().getFullYear()} SI-GESIT - Kementerian Agama Kabupaten Barito Utara.</p>
        </div>
      </footer>
    </div>
  );
}