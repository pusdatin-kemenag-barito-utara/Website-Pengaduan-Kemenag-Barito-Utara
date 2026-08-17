// Package ratelimit menyediakan rate limiter in-memory (sliding window)
// per key (mis. IP atau nomor telepon).
package ratelimit

import (
	"sync"
	"time"
)

// Limiter membatasi jumlah kejadian per jendela waktu untuk tiap key.
type Limiter struct {
	mu      sync.Mutex
	entries map[string][]time.Time
	max     int
	window  time.Duration
}

// New membuat Limiter dengan batas max kejadian per window.
func New(max int, window time.Duration) *Limiter {
	return &Limiter{
		entries: make(map[string][]time.Time),
		max:     max,
		window:  window,
	}
}

// Allow memeriksa apakah key boleh melanjutkan.
// Jika tidak, wait adalah durasi tunggu yang disarankan.
func (l *Limiter) Allow(key string) (allowed bool, wait time.Duration) {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-l.window)

	// Prune entri kedaluwarsa.
	ts := l.entries[key]
	kept := ts[:0]
	for _, t := range ts {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) == 0 {
		delete(l.entries, key)
	}

	if len(kept) >= l.max {
		return false, l.window - now.Sub(kept[0])
	}

	l.entries[key] = append(kept, now)
	return true, 0
}

// Reset menghapus seluruh catatan untuk key (mis. setelah login sukses).
func (l *Limiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key)
}