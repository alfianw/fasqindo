package dashboard

import (
	"fasqindo-backend/internal/apperr"
	"fasqindo-backend/internal/response"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// Summary godoc
// @Summary Admin dashboard summary counts
// @Produce json
// @Success 200 {object} map[string]any
// @Router /api/dashboard/summary [get]
func (h *Handler) Summary(c *gin.Context) {
	summary, err := h.service.Summary(c.Request.Context())
	if err != nil {
		apperr.Abort(c, err)
		return
	}
	response.Success(c, "Dashboard summary", summary)
}
