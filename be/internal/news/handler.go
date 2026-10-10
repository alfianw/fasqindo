package news

import (
	"strconv"

	"fasqindo-backend/internal/apperr"
	"fasqindo-backend/internal/auth"
	"fasqindo-backend/internal/response"
	"fasqindo-backend/internal/webbind"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func publicOnly(c *gin.Context) bool {
	_, isAdmin := auth.CurrentClaims(c)
	return !isAdmin
}

func (h *Handler) List(c *gin.Context) {
	items, err := h.service.List(c.Request.Context(), publicOnly(c))
	if err != nil {
		apperr.Abort(c, err)
		return
	}
	response.Success(c, "Success", items)
}

func (h *Handler) Get(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	item, err := h.service.Get(c.Request.Context(), id, publicOnly(c))
	if err != nil {
		apperr.Abort(c, err)
		return
	}
	response.Success(c, "Success", item)
}

func (h *Handler) Create(c *gin.Context) {
	var req Request
	_, image, err := webbind.Parse(c, &req)
	if err != nil {
		apperr.Abort(c, apperr.BadRequest("Invalid request body"))
		return
	}
	item, err := h.service.Create(c.Request.Context(), req, image)
	if err != nil {
		apperr.Abort(c, err)
		return
	}
	response.Created(c, "News created", item)
}

func (h *Handler) Update(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	var req Request
	_, image, err := webbind.Parse(c, &req)
	if err != nil {
		apperr.Abort(c, apperr.BadRequest("Invalid request body"))
		return
	}
	item, err := h.service.Update(c.Request.Context(), id, req, image)
	if err != nil {
		apperr.Abort(c, err)
		return
	}
	response.Success(c, "News updated", item)
}

func (h *Handler) Delete(c *gin.Context) {
	id, ok := parseID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		apperr.Abort(c, err)
		return
	}
	response.Success(c, "News deleted", nil)
}

func parseID(c *gin.Context) (uint, bool) {
	n, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || n == 0 {
		apperr.Abort(c, apperr.NotFound("Resource not found"))
		return 0, false
	}
	return uint(n), true
}
