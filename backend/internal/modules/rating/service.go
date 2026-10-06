package rating

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// ErrNotFound menandai tiket tidak ditemukan.
var ErrNotFound = database.ErrNotFound

// Service memuat logika bisnis rating.
type Service struct {
	db       *database.DB
	log      *slog.Logger
	ipLimter *ratelimit.Limiter
}

// NewService membuat Service rating dengan limiter 10/menit per IP.
func NewService(db *database.DB, log *slog.Logger) *Service {
	return &Service{db: db, log: log, ipLimter: ratelimit.New(10, time.Minute)}
}

// RateInput adalah input penilaian.
type RateInput struct {
	Ticket   string
	Rating   int
	Feedback string
	ClientIP string
}

// Rate menyimpan rating dan feedback untuk tiket.
func (s *Service) Rate(ctx context.Context, in *RateInput) error {
	if !validate.TicketFormat(in.Ticket) {
		return httpx.BadRequest("invalid_ticket", "Format nomor tiket tidak valid.")
	}
	if in.Rating < 1 || in.Rating > 5 {
		return httpx.BadRequest("invalid_rating", "Rating harus antara 1 dan 5.")
	}
	feedback := strings.TrimSpace(in.Feedback)
	if len([]rune(feedback)) > 2000 {
		return httpx.BadRequest("invalid_feedback", "Kesan maksimal 2.000 karakter.")
	}

	if ok, wait := s.ipLimter.Allow("rating:" + in.ClientIP); !ok {
		return httpx.TooManyRequests("rate_limited",
			fmt.Sprintf("Terlalu banyak permintaan. Coba lagi dalam %d detik.", int(wait.Seconds())+1))
	}

	// Cari pengaduan di PocketBase berdasarkan nomor tiket
	existing, err := database.FindFirst[map[string]any](ctx, s.db, "pengaduan", fmt.Sprintf("ticket_number = '%s'", in.Ticket))
	if err != nil || existing == nil {
		return httpx.NotFound("not_found", "Pengaduan dengan nomor tiket tersebut tidak ditemukan.")
	}

	idVal, ok := (*existing)["id"]
	if !ok {
		return httpx.NotFound("not_found", "Pengaduan tidak valid.")
	}
	id := fmt.Sprint(idVal)

	updateData := map[string]any{
		"rating": in.Rating,
	}
	if feedback != "" {
		updateData["user_feedback"] = feedback
	}

	if _, err := database.UpdateRecord[map[string]any](ctx, s.db, "pengaduan", id, updateData); err != nil {
		s.log.Error("update rating gagal", "ticket", in.Ticket, "error", err)
		return httpx.Internal("db_error", "Gagal menyimpan penilaian.")
	}
	return nil
}

// HasRated memeriksa apakah tiket sudah diberi rating.
func (s *Service) HasRated(ctx context.Context, ticket string) (bool, error) {
	existing, err := database.FindFirst[map[string]any](ctx, s.db, "pengaduan", fmt.Sprintf("ticket_number = '%s'", ticket))
	if err != nil || existing == nil {
		return false, nil
	}
	ratingVal, ok := (*existing)["rating"]
	if !ok || ratingVal == nil {
		return false, nil
	}
	switch v := ratingVal.(type) {
	case float64:
		return v > 0, nil
	case int:
		return v > 0, nil
	default:
		return false, nil
	}
}