package rating

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/httpx"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/ratelimit"
	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
	"log/slog"
)

// ErrNotFound menandai tiket tidak ditemukan.
var ErrNotFound = errors.New("record not found")

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
	Ticket       string
	Rating       int
	Feedback     string
	ClientIP     string
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

	var fb *string
	if feedback != "" {
		fb = &feedback
	}

	ct, err := s.db.Pool.Exec(ctx, `
		UPDATE `+s.db.Table("pengaduan")+`
		SET rating = $1, user_feedback = COALESCE($2, user_feedback)
		WHERE ticket_number = $3`, in.Rating, fb, in.Ticket)
	if err != nil {
		s.log.Error("update rating gagal", "ticket", in.Ticket, "error", err)
		return httpx.Internal("db_error", "Gagal menyimpan penilaian.")
	}
	if ct.RowsAffected() == 0 {
		return httpx.NotFound("not_found", "Pengaduan dengan nomor tiket tersebut tidak ditemukan.")
	}
	return nil
}

// HasRated memeriksa apakah tiket sudah diberi rating.
func (s *Service) HasRated(ctx context.Context, ticket string) (bool, error) {
	var exists bool
	err := s.db.Pool.QueryRow(ctx,
		`SELECT rating IS NOT NULL FROM pengaduan WHERE ticket_number = $1`, ticket,
	).Scan(&exists)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, nil
	}
	return exists, err
}