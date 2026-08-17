package validate

import "testing"

func TestPhoneNumber(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"081234567890", true},
		{"082157204572", true},
		{"12345", false},
		{"0812345678901234", false},
		{"+6281234567890", false},
		{"0812-3456-7890", false},
		{"abc12345678", false},
		{"", false},
	}
	for _, c := range cases {
		if got := PhoneNumber(c.in); got != c.want {
			t.Errorf("PhoneNumber(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestFullName(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"Budi Santoso", true},
		{"Ahmad Fauzi, S.Pd.", true},
		{"O'Neil Mc'Donald", true},
		{"Budi123", false},
		{"<script>alert(1)</script>", false},
		{"SELECT * FROM users", false},
		{"", false},
	}
	for _, c := range cases {
		if got := FullName(c.in); got != c.want {
			t.Errorf("FullName(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestTicketFormat(t *testing.T) {
	cases := []struct {
		in   string
		want bool
	}{
		{"SGT-20260817-000001", true},
		{"SGT-20260802-5673", true},
		{"sgt-20260817-123456", false}, // handler menaikkan huruf sebelum validasi
		{"SGT-20260817-1234567", false},
		{"SGT-20260817", false},
		{"XXX-20260817-123456", false},
		{"SGT-20260817-12345; DROP TABLE", false},
	}
	for _, c := range cases {
		if got := TicketFormat(c.in); got != c.want {
			t.Errorf("TicketFormat(%q) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestCategoryAndStatus(t *testing.T) {
	for _, c := range []string{"Saran", "Masukan", "Pengaduan", "Keluhan", "Informasi", "Tanggapan"} {
		if !Category(c) {
			t.Errorf("Category(%q) harus true", c)
		}
	}
	if Category("Hacker") {
		t.Error("Category('Hacker') harus false")
	}
	for _, s := range []string{"Menunggu", "Diproses", "Selesai", "Ditolak"} {
		if !Status(s) {
			t.Errorf("Status(%q) harus true", s)
		}
	}
	if Status("Done") {
		t.Error("Status('Done') harus false")
	}
}

func TestInRange(t *testing.T) {
	if !InRange("abc", 1, 5) {
		t.Error("InRange('abc',1,5) harus true")
	}
	if InRange("", 1, 5) {
		t.Error("InRange('',1,5) harus false")
	}
	if InRange("abcdef", 1, 5) {
		t.Error("InRange('abcdef',1,5) harus false")
	}
}