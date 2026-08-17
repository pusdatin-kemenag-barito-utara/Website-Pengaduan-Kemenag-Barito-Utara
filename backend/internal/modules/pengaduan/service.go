package pengaduan

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/config"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/idgen"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/storage"
)

const (
	maxAttachmentBytes = 5 << 20 // 5 MB
	maxContentLen      = 10000
	maxServiceUnitLen  = 100
	submitMaxRetries   = 5
)

// SubmitInput adalah data pengaduan baru dari request.
type SubmitInput struct {
	Category    string
	ServiceUnit string
	FullName    string
	PhoneNumber string
	Content     string
	IsAnonymous bool
	Turnstile   string
	Attachment  []byte
	ContentType string
	ClientIP    string
}

// TurnstileVerifier memverifikasi token Turnstile (diimplementasikan
// oleh turnstile.Verifier; diganti stub pada unit test).
type TurnstileVerifier interface {
	Verify(ctx context.Context, token string) error
}

// RepositoryPort mengakses tabel pengaduan (diimplementasikan oleh
// Repository; diganti stub pada unit test).
type RepositoryPort interface {
	Create(ctx context.Context, e *Entity) error
	SetFileURL(ctx context.Context, id interface{}, fileKey *string) error
	Delete(ctx context.Context, id interface{}) error
	FindByTicket(ctx context.Context, ticket string) (*Entity, error)
}

// Service memuat logika bisnis pengaduan.
type Service struct {
	repo      RepositoryPort
	cfg       *config.Config
	storage   *storage.Client
	turnstile TurnstileVerifier
	ipLimiter *ratelimit.Limiter
	phoneLmtr *ratelimit.Limiter
	log       *slog.Logger
}

// NewService membuat Service dengan limiter: 3 submit/5 menit per IP,
// 2 submit/30 menit per nomor HP.
func NewService(repo RepositoryPort, cfg *config.Config, st *storage.Client, tv TurnstileVerifier, log *slog.Logger) *Service {
	return &Service{
		repo:      repo,
		cfg:       cfg,
		storage:   st,
		turnstile: tv,
		ipLimiter: ratelimit.New(3, 5*time.Minute),
		phoneLmtr: ratelimit.New(2, 30*time.Minute),
		log:       log,
	}
}

// Submit memvalidasi, memverifikasi Turnstile, menyimpan pengaduan
// beserta lampiran, lalu mengembalikan nomor tiket.
func (s *Service) Submit(ctx context.Context, in *SubmitInput) (string, error) {
	if err := s.validate(in); err != nil {
		return "", err
	}

	if err := s.turnstile.Verify(ctx, in.Turnstile); err != nil {
		s.log.Warn("turnstile ditolak", "ip", in.ClientIP, "error", err)
		return "", httpx.BadRequest("turnstile_failed", "Verifikasi keamanan gagal. Silakan coba lagi.")
	}

	if ok, wait := s.ipLimiter.Allow("ip:" + in.ClientIP); !ok {
		return "", httpx.TooManyRequests("rate_limited",
			fmt.Sprintf("Terlalu banyak pengiriman. Coba lagi dalam %d detik.", int(wait.Seconds())+1))
	}
	if ok, wait := s.phoneLmtr.Allow("phone:" + in.PhoneNumber); !ok {
		return "", httpx.TooManyRequests("rate_limited",
			fmt.Sprintf("Nomor HP ini sudah digunakan untuk pengaduan baru-baru ini. Coba lagi dalam %d menit.", int(wait.Minutes())+1))
	}

	fullName := strings.TrimSpace(in.FullName)
	if in.IsAnonymous || fullName == "" {
		fullName = ""
	}
	var fullNamePtr *string
	if fullName != "" {
		fullNamePtr = &fullName
	}

	entity := &Entity{
		ID:           uuid.New(),
		TicketNumber: "",
		Category:     in.Category,
		ServiceUnit:  strings.TrimSpace(in.ServiceUnit),
		FullName:     fullNamePtr,
		PhoneNumber:  in.PhoneNumber,
		Content:      strings.TrimSpace(in.Content),
		IsAnonymous:  in.IsAnonymous,
		Status:       "Menunggu",
	}

	// Generate tiket dengan retry saat benturan nomor tiket.
	ticket, err := s.insertWithRetry(ctx, entity)
	if err != nil {
		return "", err
	}

	// Upload lampiran setelah baris tersimpan; jika gagal, rollback baris.
	if len(in.Attachment) > 0 {
		ext := extensionFor(in.ContentType)
		key := fmt.Sprintf("pengaduan/%s_%d%s", ticket, time.Now().UnixMilli(), ext)
		if err := s.storage.Upload(ctx, key, in.Attachment, in.ContentType); err != nil {
			s.log.Error("upload R2 gagal", "ticket", ticket, "error", err)
			if derr := s.repo.Delete(ctx, entity.ID); derr != nil {
				s.log.Error("rollback pengaduan gagal", "id", entity.ID, "error", derr)
			}
			return "", httpx.Internal("upload_failed", "Gagal mengunggah lampiran. Silakan coba lagi.")
		}
		if err := s.repo.SetFileURL(ctx, entity.ID, &key); err != nil {
			s.log.Error("catat file_url gagal", "ticket", ticket, "error", err)
			_ = s.storage.Delete(ctx, key)
			_ = s.repo.Delete(ctx, entity.ID)
			return "", httpx.Internal("upload_failed", "Gagal menyimpan lampiran. Silakan coba lagi.")
		}
	}

	return ticket, nil
}

func (s *Service) insertWithRetry(ctx context.Context, e *Entity) (string, error) {
	for attempt := 0; attempt < submitMaxRetries; attempt++ {
		e.TicketNumber = idgen.GenerateTicketNumber(time.Now())
		err := s.repo.Create(ctx, e)
		if err == nil {
			return e.TicketNumber, nil
		}
		if !errors.Is(err, ErrUniqueViolation) {
			return "", httpx.Internal("db_error", "Gagal menyimpan pengaduan. Silakan coba lagi.")
		}
		s.log.Warn("tiket bentrok, retry", "ticket", e.TicketNumber, "attempt", attempt+1)
	}
	return "", httpx.Internal("ticket_exhausted", "Gagal membuat nomor tiket. Silakan coba lagi.")
}

// Track mencari pengaduan untuk pelacakan publik. Lampiran diberikan
// sebagai presigned URL bila tersedia.
func (s *Service) Track(ctx context.Context, ticket string) (*TrackResult, error) {
	e, err := s.repo.FindByTicket(ctx, ticket)
	if errors.Is(err, ErrNotFound) {
		return nil, httpx.NotFound("not_found", "Pengaduan dengan nomor tiket tersebut tidak ditemukan.")
	}
	if err != nil {
		s.log.Error("track pengaduan gagal", "ticket", ticket, "error", err)
		return nil, httpx.Internal("db_error", "Gagal mengambil data pengaduan.")
	}

	res := &TrackResult{
		TicketNumber:  e.TicketNumber,
		Category:      e.Category,
		ServiceUnit:   e.ServiceUnit,
		FullName:      e.FullName,
		PhoneHint:     phoneHint(e.PhoneNumber),
		Content:       e.Content,
		IsAnonymous:   e.IsAnonymous,
		Status:        e.Status,
		AdminResponse: e.AdminResponse,
		Rating:        e.Rating,
		UserFeedback:  e.UserFeedback,
		CreatedAt:     e.CreatedAt,
		UpdatedAt:     e.UpdatedAt,
	}

	if e.FileKey != nil && s.storage.Enabled() {
		key := *e.FileKey
		// Kompatibilitas data legacy yang menyimpan prefix "r2:".
		key = strings.TrimPrefix(key, "r2:")
		url, perr := s.storage.PresignedURL(ctx, key, 15*time.Minute)
		if perr != nil {
			s.log.Warn("presign gagal", "key", key, "error", perr)
		} else {
			res.FileURL = &url
		}
	} else if e.FileKey != nil {
		res.FileURL = e.FileKey
	}

	return res, nil
}

// validate memeriksa semua input pengaduan.
func (s *Service) validate(in *SubmitInput) error {
	switch {
	case !validate.Category(in.Category):
		return httpx.BadRequest("invalid_category", "Kategori pengaduan tidak valid.")
	case strings.TrimSpace(in.ServiceUnit) == "" || !validate.InRange(in.ServiceUnit, 1, maxServiceUnitLen):
		return httpx.BadRequest("invalid_service_unit", "Unit layanan wajib diisi (maks. 100 karakter).")
	case !in.IsAnonymous && !validate.FullName(in.FullName):
		return httpx.BadRequest("invalid_name", "Nama hanya boleh huruf, spasi, dan tanda baca (maks. 150 karakter).")
	case !validate.PhoneNumber(in.PhoneNumber):
		return httpx.BadRequest("invalid_phone", "Nomor HP harus 10-13 digit angka.")
	case !validate.InRange(in.Content, 10, maxContentLen):
		return httpx.BadRequest("invalid_content", "Isi pengaduan wajib 10-10.000 karakter.")
	case len(in.Attachment) > maxAttachmentBytes:
		return httpx.BadRequest("file_too_large", "Lampiran maksimal 5 MB.")
	}
	return nil
}

// phoneHint menyamarkan nomor HP: 0812********34.
func phoneHint(p string) string {
	if len(p) <= 4 {
		return "********"
	}
	return p[:4] + strings.Repeat("*", len(p)-4) + p[len(p)-2:]
}

// extensionFor memetakan content-type ke ekstensi aman.
func extensionFor(ct string) string {
	switch strings.ToLower(ct) {
	case "image/png":
		return ".png"
	case "image/jpeg":
		return ".jpg"
	case "application/pdf":
		return ".pdf"
	default:
		return ""
	}
}