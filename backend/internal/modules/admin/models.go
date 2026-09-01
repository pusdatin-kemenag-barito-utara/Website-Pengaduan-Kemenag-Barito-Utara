package admin

import (
	"errors"
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/pkg/validate"
)

// ErrNotFound menandai data tidak ditemukan.
var ErrNotFound = errors.New("record not found")

// ListFilter untuk query daftar pengaduan.
type ListFilter struct {
	Status   string
	Category string
	Search   string
	Page     int
	PerPage  int
}

// ListResult berisi data + pagination pengaduan.
type ListResult struct {
	Items []Item `json:"items"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
	Pages int    `json:"pages"`
}

// Item adalah pengaduan untuk tampilan admin.
type Item struct {
	ID            string    `json:"id"`
	TicketNumber  string    `json:"ticket_number"`
	Category      string    `json:"category"`
	ServiceUnit   string    `json:"service_unit"`
	FullName      *string   `json:"full_name,omitempty"`
	PhoneNumber   string    `json:"phone_number"`
	Content       string    `json:"content"`
	IsAnonymous   bool      `json:"is_anonymous"`
	Status        string    `json:"status"`
	AdminResponse *string   `json:"admin_response,omitempty"`
	FileKey       *string   `json:"file_url,omitempty"`
	Rating        *int16    `json:"rating,omitempty"`
	UserFeedback  *string   `json:"user_feedback,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// RatingItem mewakili pengaduan yang telah diberi rating/ulasan.
type RatingItem struct {
	ID           string    `json:"id"`
	TicketNumber string    `json:"ticket_number"`
	Category     string    `json:"category"`
	ServiceUnit  string    `json:"service_unit"`
	FullName     *string   `json:"full_name,omitempty"`
	Rating       int       `json:"rating"`
	UserFeedback *string   `json:"user_feedback,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// RatingStats mewakili metrik IKM dan distribusi rating.
type RatingStats struct {
	TotalRated     int            `json:"total_rated"`
	AvgRating      float64        `json:"avg_rating"`
	IKMScore       float64        `json:"ikm_score"`        // Skala 100
	IKMGrade       string         `json:"ikm_grade"`        // A / B / C / D
	Distribution   map[string]int `json:"distribution"`     // "1": n, "2": n, etc.
	PerServiceUnit map[string]any `json:"per_service_unit"` // Unit -> { count, avg }
}

// RatingResult berisi ulasan + statistik IKM.
type RatingResult struct {
	Items []RatingItem `json:"items"`
	Total int          `json:"total"`
	Page  int          `json:"page"`
	Pages int          `json:"pages"`
	Stats RatingStats  `json:"stats"`
}

// Template mewakili template tanggapan admin.
type Template struct {
	ID           string    `json:"id"`
	Title        string    `json:"title"`
	StatusTarget string    `json:"status_target"`
	Content      string    `json:"content"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// ReportSummary mewakili rekapitulasi data untuk laporan kedinasan.
type ReportSummary struct {
	StartDate     string         `json:"start_date"`
	EndDate       string         `json:"end_date"`
	Total         int            `json:"total"`
	ByStatus      map[string]int `json:"by_status"`
	ByCategory    map[string]int `json:"by_category"`
	ByServiceUnit map[string]int `json:"by_service_unit"`
	AvgRating     *float64       `json:"avg_rating"`
	Items         []Item         `json:"items"`
	GeneratedAt   time.Time      `json:"generated_at"`
}

// ValidateStatus memeriksa status yang diizinkan.
func ValidateStatus(s string) bool { return validate.Status(s) }
