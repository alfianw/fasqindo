package auth

import (
	"errors"

	"fasqindo-backend/internal/apperr"
	"fasqindo-backend/internal/model"
	"fasqindo-backend/internal/response"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Login godoc
// @Summary Admin login
// @Accept json
// @Produce json
// @Param body body LoginRequest true "credentials"
// @Success 200 {object} map[string]any
// @Router /api/auth/login [post]
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperr.Abort(c, apperr.BadRequest("Invalid request body"))
		return
	}

	res, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		apperr.Abort(c, err)
		return
	}

	response.Success(c, "Login successful", res)
}

// ChangePassword godoc
// @Summary Change the signed-in admin password
// @Accept json
// @Produce json
// @Param body body ChangePasswordRequest true "passwords"
// @Success 200 {object} map[string]any
// @Router /api/auth/password [put]
func (h *Handler) ChangePassword(c *gin.Context) {
	claims, ok := CurrentClaims(c)
	if !ok {
		apperr.Abort(c, apperr.Unauthorized("Missing authorization token"))
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		apperr.Abort(c, apperr.BadRequest("Invalid request body"))
		return
	}

	if err := h.service.ChangePassword(c.Request.Context(), claims.UserID, req); err != nil {
		apperr.Abort(c, err)
		return
	}

	response.Success(c, "Password updated", nil)
}

// middleware helpers reused by the router.

// RequireAdmin rejects requests without a valid admin JWT.
func RequireAdmin(tokens *TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, err := extractClaims(c, tokens)
		if err != nil {
			apperr.Abort(c, err)
			return
		}
		if claims.Role != model.RoleAdmin {
			apperr.Abort(c, apperr.Forbidden("Admin access required"))
			return
		}
		c.Set("claims", claims)
		c.Next()
	}
}

// AttachAdmin parses the Authorization header when present and stores valid
// admin claims in the context. It never rejects the request, so public GETs
// stay accessible without a token while admins get the full dataset.
func AttachAdmin(tokens *TokenManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		if claims, err := extractClaims(c, tokens); err == nil && claims.Role == model.RoleAdmin {
			c.Set("claims", claims)
		}
		c.Next()
	}
}

func extractClaims(c *gin.Context, tokens *TokenManager) (*Claims, error) {
	header := c.GetHeader("Authorization")
	if header == "" {
		return nil, apperr.Unauthorized("Missing authorization token")
	}
	raw := header
	if len(header) > 7 && (header[:7] == "Bearer " || header[:7] == "bearer ") {
		raw = header[7:]
	} else {
		return nil, apperr.Unauthorized("Authorization header must use Bearer scheme")
	}
	claims, err := tokens.Parse(raw)
	if err != nil {
		if errors.Is(err, ErrExpiredToken) {
			return nil, apperr.Unauthorized("Token has expired")
		}
		return nil, apperr.Unauthorized("Invalid token")
	}
	return claims, nil
}

// CurrentClaims returns the claims stored by RequireAdmin/AttachAdmin.
func CurrentClaims(c *gin.Context) (*Claims, bool) {
	claims, ok := c.Get("claims")
	if !ok {
		return nil, false
	}
	res, ok := claims.(*Claims)
	return res, ok
}
