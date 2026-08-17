// Package idgen berisi generator identitas unik, termasuk nomor tiket.
package idgen

import (
	"fmt"
	"time"
)

// GenerateTicketNumber membuat nomor tiket format SGT-YYYYMMDD-XXXXXX.
// Enam digit terakhir berasal dari milidetik epoch (mod 1.000.000);
// pada benturan UNIQUE, pemanggil melakukan retry (lihat service).
func GenerateTicketNumber(now time.Time) string {
	ms := now.UnixMilli() % 1_000_000
	return fmt.Sprintf("SGT-%s-%06d", now.Format("20060102"), ms)
}