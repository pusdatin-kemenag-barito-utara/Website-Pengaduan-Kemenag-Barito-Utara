# Arsitektur SI-GESIT (pengaduan-kemenag)

## Gambaran Umum

```
Browser (Masyarakat / Admin)
        │
        ▼
┌─────────────────────────────┐
│  frontend — Astro 7 (SSR)   │  port 3000 (publik)
│  - halaman statis + React   │
│    islands (form, tracker,  │
│    panel admin)             │
│  - proxy /api/* → backend   │
└──────────────┬──────────────┘
               │ HTTP (internal)
               ▼
┌─────────────────────────────┐
│  backend — Go 1.26          │  port 8080 (internal)
│  modular monolith:          │
│  modules/{pengaduan,rating, │
│  layanan,auth,health}       │
│  pkg/ (httpx, middleware,   │
│  ratelimit, idgen, validate)│
└──────┬──────────────┬───────┘
       │              │
       ▼              ▼
   PostgreSQL      Cloudflare R2
   (pgx v5)        (lampiran file)
   schema:
   kemenag-pengaduan (tabel pengaduan, layanan, sessions, login_attempts)
```

## Keputusan Desain

- **FE**: Astro 7 dengan React islands. Konten statis (hero, panduan, footer)
  dirender Astro; bagian interaktif (form, lacak tiket, panel admin) adalah
  React islands. Satu origin: proxy `/api/*` dari Astro ke backend sehingga
  cookie session aman tanpa CORS.
- **BE**: modular monolith Go. Setiap domain punya paket sendiri
  (`handler → service → repository → dto`) dan tidak saling mencampur logika.
  Hanya `internal/pkg/*` yang dibagi (infrastruktur murni).
- **DB**: akses langsung Postgres via pgx (bukan REST Supabase). RLS tidak
  dipakai; otorisasi sepenuhnya di layer service Go.
- **Storage**: hanya Cloudflare R2. Upload dilakukan setelah row tersimpan
  (rollback jika gagal); penghapusan tiket ikut menghapus file.
- **Auth**: session token acak (hash SHA-256 di tabel `sessions`), cookie
  HttpOnly+Secure. Autentikasi mandiri untuk 1 user sistem (`super_admin`)
  yang dikonfigurasi via environment variable tanpa ketergantungan Pusdatin/GoTrue.
- **Rate limit**: in-memory sliding window per IP untuk submit (3/5 mnt),
  lacak (10/mnt), login (5/15 mnt lockout dicatat di tabel lokal `login_attempts`).

## Endpoint API (v1)

```
POST   /api/v1/pengaduan                  submit + lampiran + Turnstile
GET    /api/v1/pengaduan/{ticket}         lacak status
POST   /api/v1/pengaduan/{ticket}/rating  rating 1-5 + ulasan
GET    /api/v1/layanan                    daftar layanan (publik)
POST   /api/v1/admin/login                login (Turnstile + lockout)
POST   /api/v1/admin/logout
GET    /api/v1/admin/me                   cek sesi admin
GET    /api/v1/admin/pengaduan            list + paginasi + filter
PATCH  /api/v1/admin/pengaduan/{id}       status + tanggapan
DELETE /api/v1/admin/pengaduan/{id}       hapus + file R2
POST   /api/v1/admin/layanan              tambah layanan
PATCH  /api/v1/admin/layanan/{id}         ubah layanan
DELETE /api/v1/admin/layanan/{id}         hapus layanan
PUT    /api/v1/admin/layanan/reorder      urutan (satu transaksi)
GET    /api/v1/health                     health check
```

## Alur Request Penting

1. **Submit pengaduan**: FE kirim multipart → Go validasi (enum, panjang,
   MIME magic-bytes, ukuran ≤5MB) → verifikasi Turnstile → rate limit per IP
   → generate nomor tiket (retry anti-collision) → insert row → upload ke R2
   (gagal upload = rollback row) → kembalikan nomor tiket.
2. **Lacak tiket**: rate limit per IP → query by ticket → jika file di R2,
   buat presigned URL (1 jam) → kembalikan data + URL.
3. **Admin**: semua `/api/v1/admin/*` melewati middleware sesi. Login
   memverifikasi kredensial super_admin mandiri, lalu membuat session.
4. **Kelola layanan**: reorder dieksekusi dalam satu transaksi SQL.

## Migrasi Database

Migration SQL berada di `backend/internal/database/migrations/` dan
dijalankan otomatis saat server start (dicatat di tabel `schema_migrations`).