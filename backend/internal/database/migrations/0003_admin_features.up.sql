-- Migration 0003: Fitur Lengkap Admin Panel SI-GESIT
-- Menambahkan tabel templates dan settings

-- ============================================================
-- 1. Tabel: templates (Template Tanggapan Resmi Petugas)
-- ============================================================
CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         VARCHAR(150) NOT NULL,
    status_target VARCHAR(30) NOT NULL DEFAULT 'Diproses'
                  CHECK (status_target IN ('Menunggu', 'Diproses', 'Selesai', 'Ditolak')),
    content       TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_status ON "kemenag-pengaduan".templates (status_target);

-- ============================================================
-- 2. Tabel: settings (Konfigurasi Kedinasan & Sistem)
-- ============================================================
CREATE TABLE IF NOT EXISTS "kemenag-pengaduan".settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. Trigger: updated_at otomatis
-- ============================================================
DROP TRIGGER IF EXISTS trg_templates_updated_at ON "kemenag-pengaduan".templates;
CREATE TRIGGER trg_templates_updated_at
    BEFORE UPDATE ON "kemenag-pengaduan".templates
    FOR EACH ROW EXECUTE FUNCTION "kemenag-pengaduan".set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated_at ON "kemenag-pengaduan".settings;
CREATE TRIGGER trg_settings_updated_at
    BEFORE UPDATE ON "kemenag-pengaduan".settings
    FOR EACH ROW EXECUTE FUNCTION "kemenag-pengaduan".set_updated_at();

-- ============================================================
-- 4. Seed Data Awal
-- ============================================================
INSERT INTO "kemenag-pengaduan".templates (title, status_target, content) VALUES
    ('Sedang Ditindaklanjuti', 'Diproses', 'Pengaduan / aspirasi Anda telah kami terima dan saat ini sedang ditindaklanjuti oleh seksi / unit terkait di lingkungan Kantor Kementerian Agama Kabupaten Barito Utara. Terima kasih atas laporannya.'),
    ('Penyelesaian Pelayanan', 'Selesai', 'Pengaduan / aspirasi Anda telah selesai kami tindaklanjuti. Terima kasih atas partisipasi aktif Anda dalam membantu kami meningkatkan kualitas pelayanan publik di Kemenag Barito Utara.'),
    ('Permintaan Berkas Tambahan', 'Diproses', 'Laporan Anda sedang kami telaah. Mohon dapat melengkapi dokumen atau bukti pendukung tambahan melalui loket PTSP atau nomor WhatsApp resmi pelayanan agar dapat diproses lebih lanjut.'),
    ('Bukan Kewenangan Kemenag', 'Ditolak', 'Mohon maaf, permohonan/pengaduan yang Anda sampaikan berada di luar kewenangan Kantor Kementerian Agama Kabupaten Barito Utara. Disarankan untuk menyampaikan laporan ke instansi terkait.')
ON CONFLICT DO NOTHING;

INSERT INTO "kemenag-pengaduan".settings (key, value) VALUES
    ('office_name', 'Kantor Kementerian Agama Kabupaten Barito Utara'),
    ('office_address', 'Jl. Ahmad Yani No. 126, Muara Teweh, Kalimantan Tengah 73812'),
    ('office_phone', '(0519) 21014'),
    ('helpdesk_whatsapp', '6285117491212'),
    ('office_leader_name', 'H. Arbaja, S.Ag., M.A.P.'),
    ('office_leader_title', 'Kepala Kantor Kementerian Agama Kab. Barito Utara'),
    ('office_leader_nip', '197205151998031003'),
    ('wa_notification_template', 'Yth. Pelapor SI-GESIT, pengaduan Anda {{ticket_number}} telah diperbarui menjadi {{status}}. Pantau tiket: {{ticket_url}}')
ON CONFLICT DO NOTHING;
