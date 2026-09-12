# SI-GESIT — Pengaduan Kemenag Barito Utara

Monorepo sistem informasi pengaduan & aspirasi masyarakat
Kantor Kementerian Agama Kabupaten Barito Utara.

## Struktur

| Direktori  | Isi                                      | Teknologi        |
| ---------- | ---------------------------------------- | ---------------- |
| `frontend` | Portal publik + panel admin              | Astro 7 + React  |
| `backend`  | REST API (modular monolith)              | Go 1.26          |
| `docs`     | Dokumentasi arsitektur                   | Markdown         |

## Menjalankan di lokal

Satu perintah dari root: `npm run dev` — menyalakan **backend (port 8080)** dan
**frontend (port 3000)** sekaligus.

- Backend dijalankan via [Air](https://github.com/air-verse/air) v1.67.x:
  setiap perubahan file `.go` otomatis di-build ulang + server di-restart
  (hot reload, tanpa restart manual).
- Frontend sudah HMR otomatis dari Astro/Vite.

```bash
# 0. Instal dependensi (sekali saja)
npm install

# 1. Jalankan FE + BE sekaligus dengan injeksi Infisical Cloud
npm run dev:infisical
```

Alternatif terpisah: `npm run dev:backend` (Air, port 8080) atau
`npm run dev:frontend` (Astro, port 3000) dari root. Untuk menjalankan
manual tanpa Air: `cd backend && go run ./cmd/api`.

Migrasi schema + seed dijalankan otomatis saat backend pertama kali menyala.
Seluruh variabel lingkungan disuplai langsung oleh **Infisical Cloud** (folder `/pengaduan-kemenag`).
Tidak memerlukan file `.env` atau `.env.example` lokal.

Frontend menyalin seluruh request `/api/*` ke backend melalui `src/middleware.ts`
(Advanced Routing Astro 7). Variabel `BACKEND_INTERNAL_URL` menunjuk ke
backend (default `http://127.0.0.1:8080`).

| Endpoint publik  | Path            |
| ---------------- | --------------- |
| Portal pengaduan | `/`             |
| Lacak tiket (QR) | `/?ticket=SGT-…`|
| Barcode QR       | `/barcode`      |
| Panel admin      | `/admin`        |

## Variabel lingkungan (Tersentralisasi di Infisical Cloud)

Seluruh konfigurasi dikelola terpusat di **Infisical Cloud** (folder `/pengaduan-kemenag`, environment `dev` & `prod`):

| Variabel                     | Dipakai   | Keterangan                                   |
| ---------------------------- | --------- | -------------------------------------------- |
| `PORT`, `HOST`               | Backend   | Port HTTP internal (default 8080)            |
| `DATABASE_URL`               | Backend   | Pooler Supavisor (`:6543`), schema `kemenag-pengaduan` |
| `DB_SCHEMA`                  | Backend   | Schema aplikasi (`kemenag-pengaduan`)        |
| `SUPER_ADMIN_EMAIL` / `ADMIN_EMAIL` | Backend | Email / username akun Super Admin       |
| `SUPER_ADMIN_PASSWORD`       | Backend   | Kata sandi akun Super Admin                  |
| `SUPER_ADMIN_NAME`           | Backend   | Nama tampilan Super Admin                    |
| `SESSION_SECRET`             | Backend   | Rahasia penandatangan hash sesi admin        |
| `SESSION_TTL_HOURS`          | Backend   | Umur sesi admin (default 24)                 |
| `COOKIE_SECURE`              | Backend   | `true` di produksi (HTTPS), `false` di dev   |
| `TURNSTILE_SECRET_KEY`       | Backend   | Secret Cloudflare Turnstile (fail-closed)    |
| `R2_*`                       | Backend   | Kredensial Cloudflare R2 untuk lampiran      |
| `BACKEND_INTERNAL_URL`       | Frontend  | URL backend untuk proxy `/api/*`             |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Frontend  | Site key Cloudflare Turnstile (publik)       |
| `PUBLIC_SITE_NAME`           | Frontend  | Nama situs tampilan                          |
| `PUBLIC_SITE_URL`            | Keduanya  | URL publik situs (FE & CORS BE)              |
| `PUBLIC_HELPDESK_WHATSAPP`   | Frontend  | Nomor WhatsApp Helpdesk layanan              |
| `ALLOW_DEV_ORIGIN`           | Backend   | Origin tambahan yang diizinkan CORS (dev)    |

## Deploy dengan Docker & Coolify

Aplikasi berjalan dalam satu container terpadu (*unified single container*) dengan injeksi otomatis Infisical Universal Auth saat booting:

```bash
# Jalankan container (Infisical Universal Auth menginjeksi secrets saat boot)
docker compose up -d --build
```

- Backend: `backend/Dockerfile` (multi-stage Go, image Alpine, user `nobody`, migrasi otomatis saat start).
- Frontend: `frontend/Dockerfile` (multi-stage, adapter `@astrojs/node` standalone, port 3000, proxy `/api/*` → `http://backend:8080`).
- Healthcheck backend via `/api/v1/health`; frontend menunggu backend sehat (`depends_on.condition`).

Reverse proxy (Caddy/Nginx) meneruskan domain ke port `3000` dan mewajibkan HTTPS.
Session admin memakai cookie `sid` (HttpOnly, `COOKIE_SECURE=true` di produksi).

## Pengujian

```bash
# Backend: unit & integration test (TestHealthWithDB butuh DATABASE_URL)
cd backend
go vet ./...
go test ./...

# Frontend: typecheck
cd frontend
npm run build
```

## Detail arsitektur

Lihat [docs/architecture.md](docs/architecture.md).