package auth

import (
	"net/http"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
)

// RequireAdmin memvalidasi cookie sesi dan menolak bila tidak sah.
// Memperbaiki temuan audit K1/K2: otorisasi wajib di sisi server.
func (h *Handler) RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(CookieName)
		if err != nil || cookie.Value == "" {
			httpx.WriteError(w, httpx.Unauthorized("unauthorized", "Sesi tidak valid."))
			return
		}

		sess, err := h.svc.Lookup(r.Context(), cookie.Value)
		if err != nil {
			httpx.WriteError(w, httpx.Unauthorized("unauthorized", "Sesi tidak valid atau kedaluwarsa."))
			return
		}

		next.ServeHTTP(w, r.WithContext(WithSession(r.Context(), sess)))
	})
}