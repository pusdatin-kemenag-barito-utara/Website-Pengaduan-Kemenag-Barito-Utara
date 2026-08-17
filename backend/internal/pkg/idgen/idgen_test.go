package idgen

import (
	"regexp"
	"testing"
	"time"
)

var ticketRe = regexp.MustCompile(`^SGT-\d{8}-\d{6}$`)

func TestGenerateTicketNumberFormat(t *testing.T) {
	now := time.Date(2026, 8, 17, 13, 0, 0, 0, time.Local)
	for i := 0; i < 100; i++ {
		ticket := GenerateTicketNumber(now)
		if !ticketRe.MatchString(ticket) {
			t.Fatalf("format tiket salah: %q", ticket)
		}
	}
}

func TestGenerateTicketNumberContainsDate(t *testing.T) {
	ticket := GenerateTicketNumber(time.Date(2026, 8, 17, 1, 0, 0, 0, time.UTC))
	if ticket[:12] != "SGT-20260817" {
		t.Errorf("tanggal tidak ada di tiket: %q", ticket)
	}
}

func TestGenerateTicketNumberUniqueAcrossMs(t *testing.T) {
	seen := map[string]bool{}
	base := time.Date(2026, 8, 17, 13, 0, 0, 0, time.UTC)
	for i := 0; i < 5000; i++ {
		ticket := GenerateTicketNumber(base.Add(time.Duration(i) * time.Millisecond))
		if seen[ticket] {
			t.Fatalf("tiket duplikat: %q", ticket)
		}
		seen[ticket] = true
	}
}