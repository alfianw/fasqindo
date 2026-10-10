package apperr

import (
	"errors"
	"log/slog"
	"strconv"

	"fasqindo-backend/internal/response"

	"github.com/gin-gonic/gin"
)

type Error struct {
	Status  int
	Message string
	Err     error
}

func (e *Error) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *Error) Unwrap() error { return e.Err }

func BadRequest(message string) *Error {
	return &Error{Status: 400, Message: message}
}

func Unauthorized(message string) *Error {
	return &Error{Status: 401, Message: message}
}

func Forbidden(message string) *Error {
	return &Error{Status: 403, Message: message}
}

func NotFound(message string) *Error {
	return &Error{Status: 404, Message: message}
}

func Conflict(message string) *Error {
	return &Error{Status: 409, Message: message}
}

func Internal(message string, err error) *Error {
	return &Error{Status: 500, Message: message, Err: err}
}

// Abort converts any error into the standard API envelope and writes it.
// Internal details are logged server-side and never returned to the client.
func Abort(c *gin.Context, err error) {
	var ae *Error
	if !errors.As(err, &ae) {
		ae = Internal("Internal server error", err)
	}
	if ae.Status >= 500 || ae.Err != nil {
		slog.Error("request failed",
			"status", ae.Status,
			"message", ae.Message,
			"path", c.Request.URL.Path,
			"error", ae.Err,
		)
	}
	response.JSON(c, ae.Status, strconv.Itoa(ae.Status), ae.Message, nil)
}
