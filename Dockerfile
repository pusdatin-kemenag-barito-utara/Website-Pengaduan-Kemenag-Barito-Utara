# syntax=docker/dockerfile:1

# ===================================================
# Stage 1: Build Golang Backend
# ===================================================
FROM golang:1.24-alpine AS backend-builder
WORKDIR /src/backend

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# ===================================================
# Stage 2: Install Frontend Dependencies
# ===================================================
FROM node:22-alpine AS frontend-deps
WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# ===================================================
# Stage 3: Build Astro Frontend
# ===================================================
FROM node:22-alpine AS frontend-builder
WORKDIR /src/frontend

COPY --from=frontend-deps /src/frontend/node_modules ./node_modules
COPY frontend/ ./

ARG PUBLIC_SITE_URL="https://pengaduan.kemenag-baritoutara.com"
ARG PUBLIC_SITE_NAME="SI-GESIT — Pengaduan Masyarakat Kemenag Barito Utara"
ARG PUBLIC_TURNSTILE_SITE_KEY=""
ARG PUBLIC_GA_MEASUREMENT_ID="G-56V7KYCD71"
ARG PUBLIC_GTAG_ID="GT-T5RE5PM8"

ENV PUBLIC_SITE_URL="${PUBLIC_SITE_URL}"
ENV PUBLIC_SITE_NAME="${PUBLIC_SITE_NAME}"
ENV PUBLIC_TURNSTILE_SITE_KEY="${PUBLIC_TURNSTILE_SITE_KEY}"
ENV PUBLIC_GA_MEASUREMENT_ID="${PUBLIC_GA_MEASUREMENT_ID}"
ENV PUBLIC_GTAG_ID="${PUBLIC_GTAG_ID}"

RUN npm run build

# ===================================================
# Stage 4: Production Runtime (Unified Single Container)
# ===================================================
FROM node:22-alpine AS runner
RUN apk add --no-cache ca-certificates tzdata wget
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BACKEND_INTERNAL_URL=http://127.0.0.1:8080

# Salin Executable Backend Go
COPY --from=backend-builder /out/api /app/backend-api

# Salin File Hasil Build & Dependencies Frontend Astro
COPY --from=frontend-builder /src/frontend/dist /app/frontend/dist
COPY --from=frontend-builder /src/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /src/frontend/package.json /app/frontend/package.json

# Salin & Beri Izin Script Entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/docker-entrypoint.sh"]
