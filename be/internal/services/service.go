package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"mime/multipart"
	"strings"
	"time"

	"fasqindo-backend/internal/apperr"
	"fasqindo-backend/internal/model"
	"fasqindo-backend/internal/storage"
)

type Request struct {
	Title       string `json:"title" form:"title"`
	Description string `json:"description" form:"description"`
	Details     string `json:"details" form:"details"`
	Icon        string `json:"icon" form:"icon"`
	Status      string `json:"status" form:"status"`
}

type Response struct {
	ID          uint      `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Details     string    `json:"details"`
	Icon        string    `json:"icon"`
	ImageURL    string    `json:"image_url"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Service struct {
	repo    *Repository
	storage storage.ObjectStorage
}

func NewService(repo *Repository, store storage.ObjectStorage) *Service {
	return &Service{repo: repo, storage: store}
}

const imagePrefix = "services"

func (s *Service) List(ctx context.Context, publicOnly bool) ([]Response, error) {
	items, err := s.repo.List(ctx, publicOnly)
	if err != nil {
		return nil, apperr.Internal("Failed to load services", err)
	}
	out := make([]Response, 0, len(items))
	for i := range items {
		out = append(out, toResponse(&items[i]))
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, id uint, publicOnly bool) (*Response, error) {
	item, err := s.repo.Find(ctx, id, publicOnly)
	if err != nil {
		return nil, apperr.Internal("Failed to load service", err)
	}
	if item == nil {
		return nil, apperr.NotFound("Service not found")
	}
	res := toResponse(item)
	return &res, nil
}

func (s *Service) Create(ctx context.Context, req Request, image *multipart.FileHeader) (*Response, error) {
	if err := validate(req); err != nil {
		return nil, err
	}
	status, err := normalizeStatus(req.Status, model.StatusActive)
	if err != nil {
		return nil, err
	}

	item := &model.Service{
		Title:       strings.TrimSpace(req.Title),
		Description: strings.TrimSpace(req.Description),
		Details:     strings.TrimSpace(req.Details),
		Icon:        strings.TrimSpace(req.Icon),
		Status:      status,
	}

	imageURL, err := s.uploadImage(ctx, image, item.ImageURL)
	if err != nil {
		return nil, err
	}
	item.ImageURL = imageURL

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, apperr.Internal("Failed to create service", err)
	}
	res := toResponse(item)
	return &res, nil
}

func (s *Service) Update(ctx context.Context, id uint, req Request, image *multipart.FileHeader) (*Response, error) {
	item, err := s.repo.Find(ctx, id, false)
	if err != nil {
		return nil, apperr.Internal("Failed to load service", err)
	}
	if item == nil {
		return nil, apperr.NotFound("Service not found")
	}
	if err := validate(req); err != nil {
		return nil, err
	}
	status, err := normalizeStatus(req.Status, item.Status)
	if err != nil {
		return nil, err
	}

	oldImageURL := item.ImageURL

	// 1) validate + upload the new image (if any) BEFORE touching the record
	newImageURL, err := s.uploadImage(ctx, image, oldImageURL)
	if err != nil {
		return nil, err
	}

	item.Title = strings.TrimSpace(req.Title)
	item.Description = strings.TrimSpace(req.Description)
	item.Details = strings.TrimSpace(req.Details)
	item.Icon = strings.TrimSpace(req.Icon)
	item.Status = status
	item.ImageURL = newImageURL

	// 2) persist first
	if err := s.repo.Update(ctx, item); err != nil {
		return nil, apperr.Internal("Failed to update service", err)
	}

	// 3) only then remove the replaced object
	if image != nil && oldImageURL != "" && oldImageURL != newImageURL {
		s.deleteImage(ctx, oldImageURL)
	}

	res := toResponse(item)
	return &res, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	item, err := s.repo.Find(ctx, id, false)
	if err != nil {
		return apperr.Internal("Failed to load service", err)
	}
	if item == nil {
		return apperr.NotFound("Service not found")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return apperr.Internal("Failed to delete service", err)
	}
	if item.ImageURL != "" {
		s.deleteImage(ctx, item.ImageURL)
	}
	return nil
}

func (s *Service) uploadImage(ctx context.Context, image *multipart.FileHeader, current string) (string, error) {
	if image == nil {
		return current, nil
	}
	file, err := image.Open()
	if err != nil {
		return "", apperr.BadRequest("Cannot read uploaded image")
	}
	defer file.Close()

	url, err := s.storage.Upload(ctx, file, image, imagePrefix)
	if err != nil {
		if errors.Is(err, storage.ErrUnsupportedType) || errors.Is(err, storage.ErrFileTooLarge) || errors.Is(err, storage.ErrNoFile) {
			return "", apperr.BadRequest(err.Error())
		}
		return "", apperr.Internal("Failed to upload image", err)
	}
	return url, nil
}

// deleteImage removes a replaced/deleted object. Failures are logged so
// orphaned objects can be identified and cleaned up later; they do not fail
// the request because the database is already consistent.
func (s *Service) deleteImage(ctx context.Context, url string) {
	if err := s.storage.Delete(ctx, url); err != nil {
		slog.Warn("orphaned object after delete/replace — manual cleanup may be needed",
			"prefix", imagePrefix, "image_url", url, "error", err)
	}
}

func validate(req Request) error {
	if strings.TrimSpace(req.Title) == "" {
		return apperr.BadRequest("Title is required")
	}
	if strings.TrimSpace(req.Description) == "" {
		return apperr.BadRequest("Description is required")
	}
	if strings.TrimSpace(req.Details) == "" {
		return apperr.BadRequest("Details is required")
	}
	return nil
}

func normalizeStatus(raw, fallback string) (string, error) {
	raw = strings.ToUpper(strings.TrimSpace(raw))
	if raw == "" {
		return fallback, nil
	}
	if raw != model.StatusActive && raw != model.StatusInactive {
		return "", apperr.BadRequest(fmt.Sprintf("Status must be %s or %s", model.StatusActive, model.StatusInactive))
	}
	return raw, nil
}

func toResponse(item *model.Service) Response {
	return Response{
		ID:          item.ID,
		Title:       item.Title,
		Description: item.Description,
		Details:     item.Details,
		Icon:        item.Icon,
		ImageURL:    item.ImageURL,
		Status:      item.Status,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
	}
}
