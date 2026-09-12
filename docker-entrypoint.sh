#!/bin/sh
set -e

# ===================================================
# Injeksi Secrets dari Infisical Cloud (Universal Auth)
# ===================================================
if [ -z "$_INFISICAL_RUNNING" ]; then
  API_DOMAIN="${INFISICAL_API_URL:-${INFISICAL_HOST_URL:-https://app.infisical.com/api}}"
  ENV_TARGET="${INFISICAL_ENV:-prod}"
  PROJECT_ID="${INFISICAL_PROJECT_ID:-ad5be957-3c8a-4c2e-b21e-3838cc3a7c0e}"
  CLIENT_ID="${INFISICAL_CLIENT_ID:-$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID}"
  CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET}"
  SECRET_PATH="${INFISICAL_SECRET_PATH:-/pengaduan-kemenag}"

  # Pastikan API_DOMAIN berakhiran /api
  case "$API_DOMAIN" in
    */api) ;;
    *) API_DOMAIN="${API_DOMAIN%/}/api" ;;
  esac

  TOKEN="$INFISICAL_TOKEN"

  # Login mesin headless menggunakan Universal Auth
  if [ -z "$TOKEN" ] && [ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ]; then
    echo "[ENTRYPOINT] Melakukan autentikasi Universal Auth ke Infisical Cloud ($API_DOMAIN)..."
    TOKEN=$(infisical login --method=universal-auth --client-id="$CLIENT_ID" --client-secret="$CLIENT_SECRET" --domain="$API_DOMAIN" --plain --silent 2>/dev/null || true)
  fi

  if [ -n "$TOKEN" ]; then
    PROJECT_ARG=""
    if [ -n "$PROJECT_ID" ]; then
      PROJECT_ARG="--projectId=$PROJECT_ID"
    fi
    echo "[ENTRYPOINT] Menjalankan runtime dengan injeksi secret Infisical (env: $ENV_TARGET, path: $SECRET_PATH)..."
    export _INFISICAL_RUNNING=1
    exec infisical run --token="$TOKEN" --domain="$API_DOMAIN" --env="$ENV_TARGET" $PROJECT_ARG --path="$SECRET_PATH" --silent -- /bin/sh "$0" "$@"
  else
    echo "[ENTRYPOINT] Info: Universal Auth credentials tidak terdeteksi, melanjutkan dengan env container bawaan..."
  fi
fi

# ===================================================
# Jalankan Backend Golang API di background
# ===================================================
export PORT=8080
export HOST=0.0.0.0

(
  while true; do
    echo "[ENTRYPOINT] Menjalankan Backend Go di port 8080..."
    /app/backend-api || true
    echo "[ENTRYPOINT] Backend Go berhenti, mencoba restart otomatis dalam 2 detik..."
    sleep 2
  done
) &
BACKEND_PID=$!

echo "[ENTRYPOINT] Menunggu Backend Go aktif di port 8080..."
for i in $(seq 1 30); do
  if wget -qO- http://127.0.0.1:8080/api/v1/health > /dev/null 2>&1; then
    echo "[ENTRYPOINT] Backend Go aktif dan siap!"
    break
  fi
  sleep 0.5
done

# Tangani sinyal shutdown untuk mematikan backend secara bersih
cleanup() {
  echo "[ENTRYPOINT] Menerima sinyal termination, mematikan backend..."
  kill -TERM "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup TERM INT

# ===================================================
# Jalankan Frontend Astro SSR Server di foreground (Port 3000)
# ===================================================
export PORT=3000
export HOST=0.0.0.0
export BACKEND_INTERNAL_URL=http://127.0.0.1:8080
export ASTRO_NODE_LOGGING=disabled

cd /app/frontend
exec node ./dist/server/entry.mjs
