declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}

export const GA_MEASUREMENT_ID = import.meta.env.PUBLIC_GA_MEASUREMENT_ID || 'G-56V7KYCD71';

/**
 * Kirim custom event ke Google Analytics 4 / Google Tag (gtag.js)
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
}

/**
 * Preset event tracking terstruktur untuk seluruh interaksi SI-GESIT
 */
export const analytics = {
  // 1. Pengiriman Pengaduan Baru
  submitPengaduan: (category: string, serviceUnit: string, isAnonymous: boolean) => {
    trackEvent('submit_pengaduan', {
      event_category: 'Pengaduan',
      category_type: category,
      service_unit: serviceUnit,
      is_anonymous: isAnonymous ? 'yes' : 'no',
    });
  },

  // 2. Pencarian & Cek Status Tiket
  searchTicket: (ticketNumber: string) => {
    trackEvent('search_ticket', {
      event_category: 'Tracking',
      ticket_number: ticketNumber,
    });
  },

  // 3. Unduh Bukti Tiket (PNG)
  downloadTicketProof: (ticketNumber: string) => {
    trackEvent('download_ticket_proof', {
      event_category: 'Downloads',
      ticket_number: ticketNumber,
    });
  },

  // 4. Pemilihan Kategori Pengaduan
  selectCategory: (category: string) => {
    trackEvent('select_category', {
      event_category: 'Interaction',
      category_name: category,
    });
  },

  // 5. Klik Bantuan WhatsApp Helpdesk
  helpdeskWhatsAppClick: () => {
    trackEvent('helpdesk_whatsapp_click', {
      event_category: 'Contact',
      channel: 'WhatsApp PTSP',
    });
  },

  // 6. Pengiriman Rating & Feedback Kepuasan Layanan
  rateService: (ticketNumber: string, rating: number) => {
    trackEvent('rate_service', {
      event_category: 'Satisfaction',
      ticket_number: ticketNumber,
      rating_value: rating,
    });
  },

  // 7. Ekspor Data Admin (Excel / PDF)
  exportAdminData: (format: 'xlsx' | 'pdf', count: number) => {
    trackEvent('export_admin_data', {
      event_category: 'Admin_Export',
      file_format: format,
      total_items: count,
    });
  },
};
