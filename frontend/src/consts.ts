// Konstanta publik situs (dapat di-override via env saat build).
export const PUBLIC_SITE_NAME =
  import.meta.env.PUBLIC_SITE_NAME || 'SI-GESIT — Pengaduan Masyarakat Kemenag Barito Utara';

export const PUBLIC_SITE_DESCRIPTION =
  'Sistem Informasi Gagasan, Evaluasi, Saran, Informasi dan Tanggapan resmi Kantor Kementerian Agama Kabupaten Barito Utara.';

export const PUBLIC_SITE_URL =
  import.meta.env.PUBLIC_SITE_URL || 'https://pengaduan.kemenag-baritoutara.com';

export const PUBLIC_OG_IMAGE = `${PUBLIC_SITE_URL}/pengaduan-v2.webp`;

export const PUBLIC_HELPDESK_WHATSAPP = '6285117491212';