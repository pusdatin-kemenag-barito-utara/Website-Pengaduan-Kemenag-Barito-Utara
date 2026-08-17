package pengaduan

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/storage"
)

// stubRepo meniru repository; error injection per method.
type stubRepo struct {
	createErr error
	created   []*Entity
}

func (s *stubRepo) Create(_ context.Context, e *Entity) error {
	if s.createErr != nil {
		return s.createErr
	}
	s.created = append(s.created, e)
	return nil
}
func (s *stubRepo) SetFileURL(_ context.Context, _ interface{}, _ *string) error { return nil }
func (s *stubRepo) Delete(_ context.Context, _ interface{}) error                { return nil }
func (s *stubRepo) FindByTicket(_ context.Context, _ string) (*Entity, error)    { return nil, ErrNotFound }

// stubTurnstile melewati atau menolak verifikasi.
type stubTurnstile struct{ fail bool }

func (s *stubTurnstile) Verify(_ context.Context, _ string) error {
	if s.fail {
		return errors.New("ditolak")
	}
	return nil
}

func newTestService(repo RepositoryPort, tv TurnstileVerifier) *Service {
	cfg := &config.Config{}
	log := slog.New(slog.DiscardHandler)
	return NewService(repo, cfg, storage.NewR2("", "", "", ""), tv, log)
}

func validInput() *SubmitInput {
	return &SubmitInput{
		Category:    "Saran",
		ServiceUnit: "PTSP",
		FullName:    "Budi Santoso",
		PhoneNumber: "081234567890",
		Content:     "Isi pengaduan uji coba yang cukup panjang.",
		Turnstile:   "dummy-token",
		ClientIP:    "10.0.0.1",
	}
}

func TestSubmitValidation(t *testing.T) {
	cases := []struct {
		name   string
		mutate func(in *SubmitInput)
		code   string
	}{
		{"kategori invalid", func(in *SubmitInput) { in.Category = "Hack" }, "invalid_category"},
		{"unit layanan kosong", func(in *SubmitInput) { in.ServiceUnit = "" }, "invalid_service_unit"},
		{"nama berisi script", func(in *SubmitInput) { in.FullName = "<script>" }, "invalid_name"},
		{"hp pendek", func(in *SubmitInput) { in.PhoneNumber = "123" }, "invalid_phone"},
		{"isi terlalu pendek", func(in *SubmitInput) { in.Content = "pendek" }, "invalid_content"},
		{"isi terlalu panjang", func(in *SubmitInput) { in.Content = strings.Repeat("a", 10001) }, "invalid_content"},
		{"lampiran > 5MB", func(in *SubmitInput) {
			in.Attachment = make([]byte, maxAttachmentBytes+1)
			in.ContentType = "application/pdf"
		}, "file_too_large"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			svc := newTestService(&stubRepo{}, &stubTurnstile{})
			in := validInput()
			c.mutate(in)
			_, err := svc.Submit(context.Background(), in)
			var appErr *httpx.AppError
			if !errors.As(err, &appErr) {
				t.Fatalf("harus AppError, got %v", err)
			}
			if appErr.Code != c.code {
				t.Fatalf("kode = %q, want %q", appErr.Code, c.code)
			}
		})
	}
}

func TestSubmitTurnstileRejected(t *testing.T) {
	svc := newTestService(&stubRepo{}, &stubTurnstile{fail: true})
	_, err := svc.Submit(context.Background(), validInput())
	var appErr *httpx.AppError
	if !errors.As(err, &appErr) || appErr.Code != "turnstile_failed" {
		t.Fatalf("harus turnstile_failed, got %v", err)
	}
}

func TestSubmitAnonymity(t *testing.T) {
	repo := &stubRepo{}
	svc := newTestService(repo, &stubTurnstile{})

	// Anonim: nama harus dikosongkan.
	in := validInput()
	in.IsAnonymous = true
	in.FullName = "Tidak Mau Sebut Nama"
	if _, err := svc.Submit(context.Background(), in); err != nil {
		t.Fatal(err)
	}
	if repo.created[0].FullName != nil {
		t.Fatal("anonim harus menyimpan full_name = NULL")
	}
	if repo.created[0].IsAnonymous != true {
		t.Fatal("flag is_anonymous harus true")
	}

	// Non-anonim dengan nama kosong: harus ditolak validasi.
	in2 := validInput()
	in2.FullName = ""
	_, err := svc.Submit(context.Background(), in2)
	var appErr *httpx.AppError
	if !errors.As(err, &appErr) || appErr.Code != "invalid_name" {
		t.Fatalf("nama kosong non-anonim harus invalid_name, got %v", err)
	}
}

func TestSubmitTicketRetryOnUniqueViolation(t *testing.T) {
	repo := &stubRepo{createErr: ErrUniqueViolation}
	svc := newTestService(repo, &stubTurnstile{})
	_, err := svc.Submit(context.Background(), validInput())
	var appErr *httpx.AppError
	if !errors.As(err, &appErr) || appErr.Code != "ticket_exhausted" {
		t.Fatalf("setelah 5 retry harus ticket_exhausted, got %v", err)
	}
}

func TestSubmitRateLimitPerIP(t *testing.T) {
	svc := newTestService(&stubRepo{}, &stubTurnstile{})
	ctx := context.Background()
	// Nomor HP berbeda agar limiter phone (2/30 menit) tidak terpicu.
	for i := 0; i < 3; i++ {
		in := validInput()
		in.PhoneNumber = fmt.Sprintf("0812000000%02d", i)
		if _, err := svc.Submit(ctx, in); err != nil {
			t.Fatalf("submit ke-%d gagal: %v", i+1, err)
		}
	}
	_, err := svc.Submit(ctx, validInput())
	var appErr *httpx.AppError
	if !errors.As(err, &appErr) || appErr.Code != "rate_limited" {
		t.Fatalf("submit ke-4 harus rate_limited, got %v", err)
	}
}

func TestPhoneHint(t *testing.T) {
	if got := phoneHint("082157204572"); got != "0821********72" {
		t.Fatalf("phoneHint = %q", got)
	}
	if got := phoneHint("1234"); got != "********" {
		t.Fatalf("phoneHint pendek = %q", got)
	}
}

func TestExtensionFor(t *testing.T) {
	cases := map[string]string{
		"image/png":          ".png",
		"image/jpeg":         ".jpg",
		"application/pdf":    ".pdf",
		"application/octet-stream": "",
	}
	for ct, want := range cases {
		if got := extensionFor(ct); got != want {
			t.Errorf("extensionFor(%q) = %q, want %q", ct, got, want)
		}
	}
}