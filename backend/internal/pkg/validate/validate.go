// Package validate berisi validasi input server-side terpusat.
// Validasi ini menggantikan blacklist regex lama: query parameterized
// menangani SQL injection, dan React/teks polos menangani XSS.
package validate

import "regexp"

var (
	phoneRegex  = regexp.MustCompile(`^[0-9]{10,13}$`)
	nameRegex   = regexp.MustCompile(`^[a-zA-Z\s'.,` + "`" + `-]+$`)
	ticketRegex = regexp.MustCompile(`^SGT-\d{8}-\d{1,6}$`)
)

// Kategori & status yang diizinkan (enum di DB juga membatasi).
var (
	Categories = map[string]bool{
		"Saran": true, "Masukan": true, "Pengaduan": true,
		"Keluhan": true, "Informasi": true, "Tanggapan": true,
	}
	Statuses = map[string]bool{
		"Menunggu": true, "Diproses": true, "Selesai": true, "Ditolak": true,
	}
)

// PhoneNumber memvalidasi nomor HP: hanya angka 10-13 digit.
func PhoneNumber(s string) bool { return phoneRegex.MatchString(s) }

// FullName memvalidasi nama: huruf, spasi, dan tanda baca nama.
func FullName(s string) bool { return nameRegex.MatchString(s) }

// TicketFormat memvalidasi format nomor tiket SGT-YYYYMMDD-XXXXXX.
func TicketFormat(s string) bool { return ticketRegex.MatchString(s) }

// Category memvalidasi kategori pengaduan.
func Category(s string) bool { return Categories[s] }

// Status memvalidasi status pengaduan.
func Status(s string) bool { return Statuses[s] }

// InRange memastikan panjang string dalam batas.
func InRange(s string, minLen, maxLen int) bool {
	n := len([]rune(s))
	return n >= minLen && n <= maxLen
}