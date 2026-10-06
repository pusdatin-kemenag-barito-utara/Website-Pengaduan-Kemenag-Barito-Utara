package database

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

var (
	// ErrNotFound menandai data tidak ditemukan di database.
	ErrNotFound = errors.New("record not found")
	// ErrUniqueViolation menandai pelanggaran constraint unik.
	ErrUniqueViolation = errors.New("unique constraint violation")
)

// PBTime membungkus time.Time dengan toleransi format timestamp PocketBase (ruang spasi vs 'T').
type PBTime time.Time

func (t *PBTime) UnmarshalJSON(b []byte) error {
	s := strings.Trim(string(b), "\"")
	if s == "" || s == "null" {
		*t = PBTime(time.Time{})
		return nil
	}
	layouts := []string{
		"2006-01-02 15:04:05.000Z",
		"2006-01-02 15:04:05.000",
		"2006-01-02 15:04:05Z",
		"2006-01-02 15:04:05",
		time.RFC3339Nano,
		time.RFC3339,
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, s); err == nil {
			*t = PBTime(parsed)
			return nil
		}
	}
	return nil
}

func (t PBTime) MarshalJSON() ([]byte, error) {
	tm := time.Time(t)
	if tm.IsZero() {
		return []byte("null"), nil
	}
	return json.Marshal(tm.Format(time.RFC3339))
}

func (t PBTime) Time() time.Time {
	return time.Time(t)
}

// ListResult adalah format respons paginasi standar PocketBase.
type ListResult[T any] struct {
	Page       int `json:"page"`
	PerPage    int `json:"perPage"`
	TotalItems int `json:"totalItems"`
	TotalPages int `json:"totalPages"`
	Items      []T `json:"items"`
}

// DB mengelola koneksi dan klien HTTP ke PocketBase.
type DB struct {
	BaseURL       string
	AdminEmail    string
	AdminPassword string
	HTTPClient    *http.Client
	log           *slog.Logger

	mu          sync.RWMutex
	token       string
	tokenExpiry time.Time
}

// Connect menginisialisasi klien database PocketBase dan memverifikasi koneksi.
func Connect(ctx context.Context, baseURL, email, password string, log *slog.Logger) (*DB, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	db := &DB{
		BaseURL:       baseURL,
		AdminEmail:    email,
		AdminPassword: password,
		HTTPClient: &http.Client{
			Timeout: 15 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        100,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
		log: log,
	}

	if err := db.Ping(ctx); err != nil {
		return nil, fmt.Errorf("pocketbase ping gagal: %w", err)
	}

	if email != "" && password != "" {
		if _, err := db.getToken(ctx); err != nil {
			if log != nil {
				log.Warn("peringatan autentikasi awal pocketbase", "error", err)
			}
		}
	}

	return db, nil
}

func (db *DB) getToken(ctx context.Context) (string, error) {
	db.mu.RLock()
	if db.token != "" && time.Now().Before(db.tokenExpiry) {
		token := db.token
		db.mu.RUnlock()
		return token, nil
	}
	db.mu.RUnlock()

	db.mu.Lock()
	defer db.mu.Unlock()

	if db.token != "" && time.Now().Before(db.tokenExpiry) {
		return db.token, nil
	}

	bodyData, err := json.Marshal(map[string]string{
		"identity": db.AdminEmail,
		"password": db.AdminPassword,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, db.BaseURL+"/api/collections/_superusers/auth-with-password", bytes.NewReader(bodyData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := db.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("auth error (%d): %s", resp.StatusCode, string(respBytes))
	}

	var authResult struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&authResult); err != nil {
		return "", err
	}

	db.token = authResult.Token
	db.tokenExpiry = time.Now().Add(48 * time.Hour)
	return db.token, nil
}

// Request mengeksekusi request HTTP ke API PocketBase dengan autentikasi superuser otomatis.
func (db *DB) Request(ctx context.Context, method, endpoint string, body any, dest any) error {
	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	urlStr := db.BaseURL + endpoint
	req, err := http.NewRequestWithContext(ctx, method, urlStr, bodyReader)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if token, err := db.getToken(ctx); err == nil && token != "" {
		req.Header.Set("Authorization", token)
	}

	resp, err := db.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return ErrNotFound
	}

	if resp.StatusCode >= 400 {
		respBytes, _ := io.ReadAll(resp.Body)
		bodyStr := string(respBytes)
		if resp.StatusCode == http.StatusBadRequest && (strings.Contains(bodyStr, "validation_not_unique") || strings.Contains(bodyStr, "already exists")) {
			return ErrUniqueViolation
		}
		return fmt.Errorf("pocketbase API error (%d): %s", resp.StatusCode, bodyStr)
	}

	if dest != nil && resp.StatusCode != http.StatusNoContent {
		if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
			return err
		}
	}

	return nil
}

// ListRecords mengambil daftar record dari sebuah collection dengan paginasi dan filter.
func ListRecords[T any](ctx context.Context, db *DB, collection string, page, perPage int, filter, sort string) (*ListResult[T], error) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 {
		perPage = 30
	}

	params := url.Values{}
	params.Set("page", fmt.Sprint(page))
	params.Set("perPage", fmt.Sprint(perPage))
	if filter != "" {
		params.Set("filter", filter)
	}
	if sort != "" {
		params.Set("sort", sort)
	}

	endpoint := fmt.Sprintf("/api/collections/%s/records?%s", collection, params.Encode())
	var res ListResult[T]
	if err := db.Request(ctx, http.MethodGet, endpoint, nil, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// GetRecord mengambil satu record berdasarkan ID.
func GetRecord[T any](ctx context.Context, db *DB, collection, id string) (*T, error) {
	endpoint := fmt.Sprintf("/api/collections/%s/records/%s", collection, url.PathEscape(id))
	var res T
	if err := db.Request(ctx, http.MethodGet, endpoint, nil, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// FindFirst mencari satu record pertama yang memenuhi filter.
func FindFirst[T any](ctx context.Context, db *DB, collection, filter string) (*T, error) {
	res, err := ListRecords[T](ctx, db, collection, 1, 1, filter, "")
	if err != nil {
		return nil, err
	}
	if len(res.Items) == 0 {
		return nil, ErrNotFound
	}
	return &res.Items[0], nil
}

// CreateRecord membuat record baru pada sebuah collection.
func CreateRecord[T any](ctx context.Context, db *DB, collection string, body any) (*T, error) {
	endpoint := fmt.Sprintf("/api/collections/%s/records", collection)
	var res T
	if err := db.Request(ctx, http.MethodPost, endpoint, body, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// UpdateRecord memperbarui record berdasarkan ID.
func UpdateRecord[T any](ctx context.Context, db *DB, collection, id string, body any) (*T, error) {
	endpoint := fmt.Sprintf("/api/collections/%s/records/%s", collection, url.PathEscape(id))
	var res T
	if err := db.Request(ctx, http.MethodPatch, endpoint, body, &res); err != nil {
		return nil, err
	}
	return &res, nil
}

// DeleteRecord menghapus record berdasarkan ID.
func DeleteRecord(ctx context.Context, db *DB, collection, id string) error {
	endpoint := fmt.Sprintf("/api/collections/%s/records/%s", collection, url.PathEscape(id))
	return db.Request(ctx, http.MethodDelete, endpoint, nil, nil)
}

// Ping mengecek apakah PocketBase hidup dan merespons.
func (db *DB) Ping(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, db.BaseURL+"/api/health", nil)
	if err != nil {
		return err
	}
	resp, err := db.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("pocketbase health returned status %d", resp.StatusCode)
	}
	return nil
}

// Close menutup idle connection HTTP client.
func (db *DB) Close() {
	if db.HTTPClient != nil {
		db.HTTPClient.CloseIdleConnections()
	}
}

// Migrate memastikan skema database PocketBase siap digunakan.
func (db *DB) Migrate(ctx context.Context) error {
	return nil
}