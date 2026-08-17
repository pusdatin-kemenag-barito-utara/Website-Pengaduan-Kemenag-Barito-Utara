package turnstile

import "testing"

func TestNewDisabled(t *testing.T) {
	v := New("")
	if v.Enabled() {
		t.Fatal("secret kosong harus disabled")
	}
	if err := v.Verify(nil, "token"); err == nil {
		t.Fatal("verify dengan secret kosong harus gagal (fail-closed)")
	}
}

func TestNewEnabledEmptyToken(t *testing.T) {
	v := New("secret")
	if !v.Enabled() {
		t.Fatal("secret terisi harus enabled")
	}
	if err := v.Verify(nil, ""); err == nil {
		t.Fatal("token kosong harus ditolak")
	}
}