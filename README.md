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
# 1. Siapkan env (sekali saja, di root monorepo)
cp .env.example .env.local
# isi DATABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SECRET_KEY, SESSION_SECRET

# 2. Jalankan FE + BE sekaligus
npm run dev
```

Alternatif terpisah: `npm run dev:backend` (Air, port 8080) atau
`npm run dev:frontend` (Astro, port 3000) dari root. Untuk menjalankan
manual tanpa Air: `cd backend && go run ./cmd/api`.

Migrasi schema + seed dijalankan otomatis saat backend pertama kali menyala.
Backend membaca `.env.local` dari direktori kerjanya, lalu fallback ke root
monorepo. Frontend membacanya via `envDir: '../'` di `astro.config.mjs`.

Frontend menyalin seluruh request `/api/*` ke backend melalui `src/fetch.ts`
(Advanced Routing Astro 7). Variabel `BACKEND_INTERNAL_URL` menunjuk ke
backend (default `http://127.0.0.1:8080`).

| Endpoint publik  | Path            |
| ---------------- | --------------- |
| Portal pengaduan | `/`             |
| Lacak tiket (QR) | `/?ticket=SGT-…`|
| Barcode QR       | `/barcode`      |
| Panel admin      | `/admin`        |

## Variabel lingkungan

Satu file `/.env.local` (contoh: `/.env.example`). Variabel dibaca bersama oleh
backend dan frontend:

| Variabel                     | Dipakai   | Keterangan                                   |
| ---------------------------- | --------- | -------------------------------------------- |
| `PORT`, `HOST`               | Backend   | Port HTTP (default 8080)                     |
| `DATABASE_URL`               | Backend   | Pooler Supavisor (`:6543`), schema `kemenag-pengaduan` |
| `DB_SCHEMA`                  | Backend   | Schema aplikasi (default `kemenag-pengaduan`)|
| `ADMIN_EMAIL`                | Backend   | Email/Username Super Admin (default baritoutara@kemenag.go.id) |
| `ADMIN_PASSWORD`             | Backend   | Kata sandi Super Admin                       |
| `ADMIN_NAME`                 | Backend   | Nama tampilan Super Admin                    |
| `SESSION_SECRET`             | Backend   | Rahasia penandatangan hash sesi admin        |
| `SESSION_TTL_HOURS`          | Backend   | Umur sesi admin (default 24)                 |
| `COOKIE_SECURE`              | Backend   | `true` di produksi (HTTPS)                   |
| `TURNSTILE_SECRET_KEY`       | Backend   | Secret Cloudflare Turnstile (fail-closed)    |
| `R2_*`                       | Backend   | Kredensial Cloudflare R2 untuk lampiran (opsional) |
| `BACKEND_INTERNAL_URL`       | Frontend  | URL backend untuk proxy `/api/*` (default `http://127.0.0.1:8080`) |
| `PUBLIC_TURNSTILE_SITE_KEY`  | Frontend  | Site key Cloudflare Turnstile (publik)       |
| `PUBLIC_SITE_NAME`           | Frontend  | Nama situs tampilan (opsional)               |
| `PUBLIC_SITE_URL`            | Keduanya  | URL publik situs — QR bukti tiket (FE), CORS (BE) |
| `ALLOW_DEV_ORIGIN`           | Backend   | Origin tambahan yang diizinkan CORS (dev)    |

## Deploy dengan Docker

```bash
# Siapkan env (root monorepo), lalu deploy
cp .env.example .env.local   # isi kredensial produksi
docker compose --env-file .env.local up -d --build
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