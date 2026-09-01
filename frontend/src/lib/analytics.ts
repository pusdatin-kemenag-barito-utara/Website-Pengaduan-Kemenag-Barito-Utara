/**
 * Enterprise Analytics SDK — SI-GESIT Kemenag Barito Utara
 *
 * Mendukung arsitektur Dual-Tagging:
 * 1. Google Tag Manager (DataLayer Architecture)
 * 2. Google Analytics 4 / Google Tag (gtag.js Direct API)
 *
 * Dilengkapi dengan:
 * - Google Consent Mode v2
 * - PII Sanitizer & Auto Data Scrubbing (Anti-Leak Nomor HP, NIK, Email)
 * - Real User Monitoring (Core Web Vitals)
 * - Funnel Lifecycle Tracking (Pengaduan, Lacak, Rating, WhatsApp, Admin)
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, any> | any[]>;
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.PUBLIC_GA_MEASUREMENT_ID || '';
export const GTAG_ID = import.meta.env.PUBLIC_GTAG_ID || '';
export const GTM_ID = import.meta.env.PUBLIC_GTM_ID || '';
export const CF_BEACON_TOKEN = import.meta.env.PUBLIC_CF_BEACON_TOKEN || '';

/**
 * Sanitasi data dari potensi PII (Personally Identifiable Information).
 * Menyamarkan nomor HP, NIK, dan email masyarakat sebelum dikirim ke analitik.
 */
export function sanitizePII(value: any): any {
  if (typeof value === 'string') {
    // Masking nomor telepon (contoh: 081234567890 -> 0812****7890)
    let sanitized = value.replace(/(\+?62|0)8(\d{2})(\d+)(\d{3})/g, (_match, p1, p2, _middle, p4) => {
      return `${p1}8${p2}****${p4}`;
    });

    // Masking email (contoh: nama@domain.com -> n***@domain.com)
    sanitized = sanitized.replace(/([a-zA-Z0-9_\-.+]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g, (_match, user, domain) => {
      if (user.length <= 2) return `${user[0]}***@${domain}`;
      return `${user.substring(0, 2)}***@${domain}`;
    });

    // Masking NIK / Angka identitas 16 digit (contoh: 6205012345670001 -> 6205****0001)
    sanitized = sanitized.replace(/\b(\d{4})\d{8}(\d{4})\b/g, '$1****$2');

    return sanitized;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizePII);
  }

  if (value !== null && typeof value === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      // Lewati field sensitif langsung
      if (/password|token|secret|pin|nik|ktp/i.test(k)) {
        continue;
      }
      cleanObj[k] = sanitizePII(v);
    }
    return cleanObj;
  }

  return value;
}

/**
 * Kirim event terpadu ke Google Tag Manager (dataLayer) dan Google Analytics 4 (gtag).
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  const cleanParams = params ? sanitizePII(params) : {};
  const enrichedParams = {
    ...cleanParams,
    service_name: 'SI-GESIT',
    agency: 'Kemenag Barito Utara',
    timestamp: new Date().toISOString(),
  };

  // 1. Dispatch ke Google Tag Manager dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...enrichedParams,
  });

  // 2. Dispatch langsung ke GA4 via gtag.js jika tersedia
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, enrichedParams);
  }

  // Debug logger di mode development
  if (import.meta.env.DEV) {
    console.debug(`%c[Analytics:Event] %c${eventName}`, 'color: #047857; font-weight: bold;', 'color: #0284c7;', enrichedParams);
  }
}

/**
 * Enterprise Analytics SDK — Preset Event Terstruktur SI-GESIT
 */
export const analytics = {
  // ==========================================
  // 1. FUNNEL: PENGADUAN MASYARAKAT (COMPLAINT LIFE CYCLE)
  // ==========================================
  
  // Pengguna mulai berinteraksi dengan form pengaduan
  complaintFormStarted: (initialCategory?: string) => {
    trackEvent('complaint_flow_start', {
      event_category: 'Complaint_Funnel',
      step: 1,
      initial_category: initialCategory || 'none',
    });
  },

  // Pengguna memilih kategori pengaduan
  complaintCategorySelected: (category: string, title?: string) => {
    trackEvent('complaint_category_select', {
      event_category: 'Complaint_Funnel',
      step: 2,
      category_id: category,
      category_title: title || category,
    });
  },

  // Pengguna memilih unit layanan
  complaintUnitSelected: (unit: string) => {
    trackEvent('complaint_unit_select', {
      event_category: 'Complaint_Funnel',
      step: 3,
      service_unit: unit,
    });
  },

  // Pengguna mengubah opsi pengaduan anonim
  complaintAnonymousToggled: (isAnonymous: boolean) => {
    trackEvent('complaint_anonymous_toggle', {
      event_category: 'Complaint_Funnel',
      is_anonymous: isAnonymous ? 'true' : 'false',
    });
  },

  // Pengguna mengunggah lampiran pendukung
  complaintAttachmentUploaded: (fileType: string, fileSizeKb: number) => {
    trackEvent('complaint_attachment_upload', {
      event_category: 'Complaint_Funnel',
      file_type: fileType,
      file_size_kb: Math.round(fileSizeKb),
    });
  },

  // Pengguna menekan tombol kirim pengaduan (attempt)
  complaintSubmitAttempt: (category: string, serviceUnit: string) => {
    trackEvent('complaint_submit_attempt', {
      event_category: 'Complaint_Funnel',
      step: 4,
      category_type: category,
      service_unit: serviceUnit,
    });
  },

  // Pengaduan berhasil dikirim dan nomor tiket diterbitkan
  submitPengaduan: (category: string, serviceUnit: string, isAnonymous: boolean, durationSec?: number) => {
    trackEvent('submit_pengaduan', {
      event_category: 'Complaint_Funnel',
      step: 5,
      category_type: category,
      service_unit: serviceUnit,
      is_anonymous: isAnonymous ? 'yes' : 'no',
      form_fill_duration_seconds: durationSec || 0,
      conversion: true,
    });
  },

  // Pengiriman pengaduan gagal (validasi / turnstile / server)
  complaintSubmitFailed: (errorType: string, errorMessage: string) => {
    trackEvent('complaint_submit_error', {
      event_category: 'Complaint_Funnel',
      error_type: errorType,
      error_message: errorMessage,
    });
  },

  // Unduh Bukti Tiket (PNG / PDF)
  downloadTicketProof: (ticketNumber: string, format: 'png' | 'pdf' = 'png') => {
    trackEvent('download_ticket_proof', {
      event_category: 'Complaint_Action',
      ticket_number: ticketNumber,
      file_format: format,
    });
  },

  // Salin Nomor Tiket ke Clipboard
  copyTicketNumber: (ticketNumber: string) => {
    trackEvent('copy_ticket_number', {
      event_category: 'Complaint_Action',
      ticket_number: ticketNumber,
    });
  },

  // ==========================================
  // 2. FUNNEL: LACAK TIKET & PENILAIAN KEPUASAN (RATING)
  // ==========================================

  // Pencarian status tiket (attempt)
  searchTicketAttempt: (ticketNumber: string) => {
    trackEvent('ticket_search_attempt', {
      event_category: 'Tracking_Funnel',
      ticket_number: ticketNumber,
    });
  },

  // Pencarian tiket berhasil ditemukan
  searchTicket: (ticketNumber: string, status?: string) => {
    trackEvent('search_ticket', {
      event_category: 'Tracking_Funnel',
      ticket_number: ticketNumber,
      ticket_status: status || 'found',
    });
  },

  // Pencarian tiket tidak ditemukan
  searchTicketNotFound: (ticketNumber: string) => {
    trackEvent('search_ticket_not_found', {
      event_category: 'Tracking_Funnel',
      ticket_number: ticketNumber,
    });
  },

  // Pengiriman Penilaian Kepuasan (Rating 1-5 Bintang)
  rateService: (ticketNumber: string, rating: number, hasFeedback: boolean = false) => {
    trackEvent('rate_service', {
      event_category: 'Satisfaction_Funnel',
      ticket_number: ticketNumber,
      rating_value: rating,
      has_written_feedback: hasFeedback ? 'yes' : 'no',
    });
  },

  // ==========================================
  // 3. ENGAGEMENT, HELPDESK & NAVIGATION
  // ==========================================

  // Klik Bantuan WhatsApp PTSP
  helpdeskWhatsAppClick: (source: string = 'floating_button') => {
    trackEvent('helpdesk_whatsapp_click', {
      event_category: 'Helpdesk_Contact',
      channel: 'WhatsApp PTSP Kemenag',
      click_source: source,
    });
  },

  // Klik Tautan Eksternal / Portal Terkait
  outboundLinkClick: (url: string, title: string) => {
    trackEvent('outbound_link_click', {
      event_category: 'Navigation',
      destination_url: url,
      link_title: title,
    });
  },

  // Membuka Modal Panduan Pengaduan
  openGuideModal: () => {
    trackEvent('open_guide_modal', {
      event_category: 'Engagement',
      action: 'view_guide',
    });
  },

  // Interaksi Halaman Barcode QR Stand
  barcodeAction: (action: 'download' | 'print' | 'view') => {
    trackEvent('barcode_action', {
      event_category: 'Barcode_QR',
      action_type: action,
    });
  },

  // Pemilihan Kategori (backward compatibility)
  selectCategory: (category: string) => {
    trackEvent('select_category', {
      event_category: 'Interaction',
      category_name: category,
    });
  },

  // ==========================================
  // 4. PORTAL ADMIN & OPERASIONAL
  // ==========================================

  adminLoginAttempt: () => {
    trackEvent('admin_login_attempt', {
      event_category: 'Admin_Security',
    });
  },

  adminLoginSuccess: (role: string) => {
    trackEvent('admin_login_success', {
      event_category: 'Admin_Security',
      user_role: role,
    });
  },

  adminLoginFailed: (reason: string) => {
    trackEvent('admin_login_failed', {
      event_category: 'Admin_Security',
      failure_reason: reason,
    });
  },

  adminLogout: () => {
    trackEvent('admin_logout', {
      event_category: 'Admin_Security',
    });
  },

  adminFilterChanged: (filterType: 'status' | 'category' | 'search', filterValue: string) => {
    trackEvent('admin_filter_change', {
      event_category: 'Admin_Operations',
      filter_type: filterType,
      filter_value: filterValue,
    });
  },

  exportAdminData: (format: 'xlsx' | 'pdf', count: number) => {
    trackEvent('export_admin_data', {
      event_category: 'Admin_Export',
      file_format: format,
      total_items: count,
    });
  },

  adminStatusUpdate: (ticketNumber: string, oldStatus: string, newStatus: string) => {
    trackEvent('admin_status_update', {
      event_category: 'Admin_Operations',
      ticket_number: ticketNumber,
      previous_status: oldStatus,
      new_status: newStatus,
    });
  },

  // ==========================================
  // 5. REAL USER MONITORING (RUM) & SYSTEM EXCEPTIONS
  // ==========================================

  webVitalsMetric: (name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') => {
    trackEvent('core_web_vitals', {
      event_category: 'Web_Performance',
      metric_name: name,
      metric_value: Math.round(value),
      metric_rating: rating,
    });
  },

  clientErrorTrack: (errorType: string, message: string, route?: string) => {
    trackEvent('client_javascript_error', {
      event_category: 'Application_Errors',
      error_type: errorType,
      error_message: message.substring(0, 150),
      route: route || (typeof window !== 'undefined' ? window.location.pathname : 'unknown'),
    });
  },
};
