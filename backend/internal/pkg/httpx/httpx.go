// Package httpx berisi helper respons HTTP dan tipe error terpusat untuk Fiber v3.
package httpx

import (
	"errors"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// AppError adalah error aplikasi dengan status HTTP dan kode mesin.
type AppError struct {
	Status  int    `json:"-"`
	Code    string `json:"error"`
	Message string `json:"message"`
}

func (e *AppError) Error() string { return e.Message }

// NewAppError membuat AppError.
func NewAppError(status int, code, message string) *AppError {
	return &AppError{Status: status, Code: code, Message: message}
}

// Helper pembuat error umum.
func BadRequest(code, msg string) *AppError        { return NewAppError(fiber.StatusBadRequest, code, msg) }
func Unauthorized(code, msg string) *AppError      { return NewAppError(fiber.StatusUnauthorized, code, msg) }
func Forbidden(code, msg string) *AppError         { return NewAppError(fiber.StatusForbidden, code, msg) }
func NotFound(code, msg string) *AppError          { return NewAppError(fiber.StatusNotFound, code, msg) }
func Conflict(code, msg string) *AppError          { return NewAppError(fiber.StatusConflict, code, msg) }
func TooManyRequests(code, msg string) *AppError   { return NewAppError(fiber.StatusTooManyRequests, code, msg) }
func Unprocessable(code, msg string) *AppError     { return NewAppError(fiber.StatusUnprocessableEntity, code, msg) }
func Internal(code, msg string) *AppError          { return NewAppError(fiber.StatusInternalServerError, code, msg) }

// JSON menulis respons JSON via Fiber Ctx.
func JSON(c fiber.Ctx, status int, v any) error {
	return c.Status(status).JSON(v)
}

// WriteError menulis error sebagai JSON; error non-AppError menjadi 500.
func WriteError(c fiber.Ctx, err error) error {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return c.Status(appErr.Status).JSON(fiber.Map{
			"success": false,
			"error":   appErr.Code,
			"message": appErr.Message,
		})
	}
	slog.Error("internal error", "error", err)
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
		"success": false,
		"error":   "internal_error",
		"message": "Terjadi kesalahan pada server.",
	})
}