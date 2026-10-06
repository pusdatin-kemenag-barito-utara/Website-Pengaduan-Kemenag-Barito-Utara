package pengaduan

import (
	"time"

	"github.com/kemenag-baritoutara/pengaduan-kemenag/backend/internal/database"
)

// Entity merepresentasikan satu baris record pengaduan.
type Entity struct {
	ID            string           `json:"id"`
	OriginalID    string           `json:"original_id,omitempty"`
	TicketNumber  string           `json:"ticket_number"`
	Category      string           `json:"category"`
	ServiceUnit   string           `json:"service_unit"`
	FullName      *string          `json:"full_name,omitempty"`
	PhoneNumber   string           `json:"phone_number"`
	Content       string           `json:"content"`
	IsAnonymous   bool             `json:"is_anonymous"`
	Status        string           `json:"status"`
	AdminResponse *string          `json:"admin_response,omitempty"`
	FileKey       *string          `json:"file_url,omitempty"`
	Rating        *int16           `json:"rating,omitempty"`
	UserFeedback  *string          `json:"user_feedback,omitempty"`
	CreatedAt     database.PBTime  `json:"created_at"`
	UpdatedAt     database.PBTime  `json:"updated_at"`
}

// TrackResult adalah status respons pelacakan publik (nomor HP disembunyikan parsial).
type TrackResult struct {
	TicketNumber  string     `json:"ticket_number"`
	Category      string     `json:"category"`
	ServiceUnit   string     `json:"service_unit"`
	FullName      *string    `json:"full_name,omitempty"`
	PhoneHint     string     `json:"phone_hint"`
	Content       string     `json:"content"`
	IsAnonymous   bool       `json:"is_anonymous"`
	Status        string     `json:"status"`
	AdminResponse *string    `json:"admin_response,omitempty"`
	Rating        *int16     `json:"rating,omitempty"`
	UserFeedback  *string    `json:"user_feedback,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
	FileURL       *string    `json:"file_url,omitempty"`
}