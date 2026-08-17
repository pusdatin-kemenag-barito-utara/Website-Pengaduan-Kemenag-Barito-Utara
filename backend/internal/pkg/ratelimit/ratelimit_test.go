package ratelimit

import (
	"testing"
	"time"
)

func TestAllowWithinLimit(t *testing.T) {
	l := New(3, time.Minute)
	for i := 0; i < 3; i++ {
		ok, _ := l.Allow("ip:1.2.3.4")
		if !ok {
			t.Fatalf("permintaan ke-%d harus diizinkan", i+1)
		}
	}
	ok, wait := l.Allow("ip:1.2.3.4")
	if ok {
		t.Fatal("permintaan ke-4 harus ditolak")
	}
	if wait <= 0 {
		t.Fatalf("wait harus > 0, got %v", wait)
	}
}

func TestSeparateKeys(t *testing.T) {
	l := New(1, time.Minute)
	if ok, _ := l.Allow("a"); !ok {
		t.Fatal("key a harus diizinkan")
	}
	if ok, _ := l.Allow("b"); !ok {
		t.Fatal("key b harus diizinkan (independen)")
	}
	if ok, _ := l.Allow("a"); ok {
		t.Fatal("key a harus ditolak")
	}
}

func TestWindowExpiry(t *testing.T) {
	l := New(1, 50*time.Millisecond)
	if ok, _ := l.Allow("k"); !ok {
		t.Fatal("pertama harus diizinkan")
	}
	if ok, _ := l.Allow("k"); ok {
		t.Fatal("kedua harus ditolak")
	}
	time.Sleep(60 * time.Millisecond)
	if ok, _ := l.Allow("k"); !ok {
		t.Fatal("setelah jendela, harus diizinkan lagi")
	}
}

func TestReset(t *testing.T) {
	l := New(1, time.Minute)
	_, _ = l.Allow("k")
	l.Reset("k")
	if ok, _ := l.Allow("k"); !ok {
		t.Fatal("setelah reset harus diizinkan")
	}
}