// Package turnstile memverifikasi token Cloudflare Turnstile.
// Tidak ada fallback "test secret" dan kegagalan jaringan = verifikasi gagal.
package turnstile

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const siteVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// Verifier memverifikasi token Turnstile dengan secret key.
type Verifier struct {
	secret string
	client *http.Client
}

// New membuat Verifier. Jika secret kosong, verifikasi selalu menolak
// (fail-closed) agar tidak ada jalur bypass.
func New(secret string) *Verifier {
	return &Verifier{
		secret: secret,
		client: &http.Client{Timeout: 5 * time.Second},
	}
}

// Enabled mengembalikan true bila secret dikonfigurasi.
func (v *Verifier) Enabled() bool { return v.secret != "" }

type siteVerifyResponse struct {
	Success bool `json:"success"`
}

// Verify memvalidasi token. Mengembalikan error bila verifikasi gagal
// atau layanan Turnstile tidak dapat dihubungi.
func (v *Verifier) Verify(ctx context.Context, token string) error {
	if !v.Enabled() {
		return fmt.Errorf("TURNSTILE_SECRET_KEY belum dikonfigurasi")
	}
	if token == "" {
		return fmt.Errorf("token Turnstile kosong")
	}

	form := url.Values{}
	form.Set("secret", v.secret)
	form.Set("response", token)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, siteVerifyURL, bytes.NewBufferString(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := v.client.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi Turnstile: %w", err)
	}
	defer resp.Body.Close()

	var body siteVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return fmt.Errorf("respon Turnstile tidak valid: %w", err)
	}
	if !body.Success {
		return fmt.Errorf("verifikasi Turnstile ditolak")
	}
	return nil
}