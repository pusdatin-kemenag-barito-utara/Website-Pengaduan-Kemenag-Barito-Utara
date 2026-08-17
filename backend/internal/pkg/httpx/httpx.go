// Package httpx berisi helper respons HTTP dan tipe error terpusat.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
)

// AppError adalah error aplikasi dengan status HTTP dan kode mesin.
type AppError struct {
	Status  int
	Code    string
	Message string
}

func (e *AppError) Error() string { return e.Message }

// NewAppError membuat AppError.
func NewAppError(status int, code, message string) *AppError {
	return &AppError{Status: status, Code: code, Message: message}
}

// Helper pembuat error umum.
func BadRequest(code, msg string) *AppError        { return NewAppError(http.StatusBadRequest, code, msg) }
func Unauthorized(code, msg string) *AppError      { return NewAppError(http.StatusUnauthorized, code, msg) }
func Forbidden(code, msg string) *AppError         { return NewAppError(http.StatusForbidden, code, msg) }
func NotFound(code, msg string) *AppError          { return NewAppError(http.StatusNotFound, code, msg) }
func Conflict(code, msg string) *AppError          { return NewAppError(http.StatusConflict, code, msg) }
func TooManyRequests(code, msg string) *AppError   { return NewAppError(http.StatusTooManyRequests, code, msg) }
func Unprocessable(code, msg string) *AppError     { return NewAppError(http.StatusUnprocessableEntity, code, msg) }
func Internal(code, msg string) *AppError          { return NewAppError(http.StatusInternalServerError, code, msg) }

// JSON menulis respons JSON.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Error("encode json response", "error", err)
	}
}

// WriteError menulis error sebagai JSON; error non-AppError menjadi 500.
func WriteError(w http.ResponseWriter, err error) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		JSON(w, appErr.Status, map[string]any{
			"success": false,
			"error":   appErr.Code,
			"message": appErr.Message,
		})
		return
	}
	slog.Error("internal error", "error", err)
	JSON(w, http.StatusInternalServerError, map[string]any{
		"success": false,
		"error":   "internal_error",
		"message": "Terjadi kesalahan pada server.",
	})
}