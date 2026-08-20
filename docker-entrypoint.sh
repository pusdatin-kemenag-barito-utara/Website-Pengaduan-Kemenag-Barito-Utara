#!/bin/sh
set -e

# Jalankan Backend Golang API di background dengan auto-restart loop
export PORT=8080
(
  while true; do
    echo "[ENTRYPOINT] Menjalankan Backend Go..."
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
  echo "[ENTRYPOINT] Mematikan service..."
  kill -TERM "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup TERM INT

# Jalankan Frontend Astro SSR Server di foreground (Port 3000 publik)
export PORT=3000
export HOST=0.0.0.0
export BACKEND_INTERNAL_URL=http://127.0.0.1:8080

cd /app/frontend
exec node ./dist/server/entry.mjs
