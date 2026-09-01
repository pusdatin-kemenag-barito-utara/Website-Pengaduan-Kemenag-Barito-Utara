// Package ratelimit menyediakan rate limiter in-memory (sliding window)
// per key (mis. IP atau nomor telepon) dengan pembersihan memori otomatis.
package ratelimit

import (
	"sync"
	"time"
)

// Limiter membatasi jumlah kejadian per jendela waktu untuk tiap key.
type Limiter struct {
	mu       sync.Mutex
	entries  map[string][]time.Time
	max      int
	window   time.Duration
	stopChan chan struct{}
}

// New membuat Limiter dengan batas max kejadian per window dan pembersih memori otomatis.
func New(max int, window time.Duration) *Limiter {
	l := &Limiter{
		entries:  make(map[string][]time.Time),
		max:      max,
		window:   window,
		stopChan: make(chan struct{}),
	}

	// Background worker untuk membersihkan IP kadaluwarsa secara berkala (mencegah memory leak)
	go l.startCleanupLoop(5 * time.Minute)

	return l
}

func (l *Limiter) startCleanupLoop(interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			l.mu.Lock()
			cutoff := time.Now().Add(-l.window)
			for key, ts := range l.entries {
				hasActive := false
				for _, t := range ts {
					if t.After(cutoff) {
						hasActive = true
						break
					}
				}
				if !hasActive {
					delete(l.entries, key)
				}
			}
			l.mu.Unlock()
		case <-l.stopChan:
			return
		}
	}
}

// Close menghentikan background cleanup loop bila diperlukan.
func (l *Limiter) Close() {
	select {
	case <-l.stopChan:
	default:
		close(l.stopChan)
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