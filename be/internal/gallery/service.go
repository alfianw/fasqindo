package gallery

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
	Title    string `json:"title" form:"title"`
	Caption  string `json:"caption" form:"caption"`
	Category string `json:"category" form:"category"`
	Status   string `json:"status" form:"status"`
}

type Response struct {
	ID        uint      `json:"id"`
	Title     string    `json:"title"`
	Caption   string    `json:"caption"`
	Category  string    `json:"category"`
	ImageURL  string    `json:"image_url"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Service struct {
	repo    *Repository
	storage storage.ObjectStorage
}

func NewService(repo *Repository, store storage.ObjectStorage) *Service {
	return &Service{repo: repo, storage: store}
}

const imagePrefix = "gallery"

func (s *Service) List(ctx context.Context, publicOnly bool) ([]Response, error) {
	items, err := s.repo.List(ctx, publicOnly)
	if err != nil {
		return nil, apperr.Internal("Failed to load gallery", err)
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
		return nil, apperr.Internal("Failed to load gallery item", err)
	}
	if item == nil {
		return nil, apperr.NotFound("Gallery item not found")
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
	if image == nil {
		return nil, apperr.BadRequest("Image is required")
	}

	imageURL, err := s.doUpload(ctx, image)
	if err != nil {
		return nil, err
	}

	item := &model.Gallery{
		Title:    strings.TrimSpace(req.Title),
		Caption:  strings.TrimSpace(req.Caption),
		Category: strings.TrimSpace(req.Category),
		Status:   status,
		ImageURL: imageURL,
	}
	if err := s.repo.Create(ctx, item); err != nil {
		// upload succeeded but the row failed: clean up the new object
		s.deleteImage(ctx, imageURL)
		return nil, apperr.Internal("Failed to create gallery item", err)
	}
	res := toResponse(item)
	return &res, nil
}

func (s *Service) Update(ctx context.Context, id uint, req Request, image *multipart.FileHeader) (*Response, error) {
	item, err := s.repo.Find(ctx, id, false)
	if err != nil {
		return nil, apperr.Internal("Failed to load gallery item", err)
	}
	if item == nil {
		return nil, apperr.NotFound("Gallery item not found")
	}
	if err := validate(req); err != nil {
		return nil, err
	}
	status, err := normalizeStatus(req.Status, item.Status)
	if err != nil {
		return nil, err
	}

	oldImageURL := item.ImageURL

	newImageURL := oldImageURL
	if image != nil {
		newImageURL, err = s.doUpload(ctx, image)
		if err != nil {
			return nil, err
		}
	}

	item.Title = strings.TrimSpace(req.Title)
	item.Caption = strings.TrimSpace(req.Caption)
	item.Category = strings.TrimSpace(req.Category)
	item.Status = status
	item.ImageURL = newImageURL

	if err := s.repo.Update(ctx, item); err != nil {
		return nil, apperr.Internal("Failed to update gallery item", err)
	}

	if image != nil && oldImageURL != "" && oldImageURL != newImageURL {
		s.deleteImage(ctx, oldImageURL)
	}

	res := toResponse(item)
	return &res, nil
}

func (s *Service) Delete(ctx context.Context, id uint) error {
	item, err := s.repo.Find(ctx, id, false)
	if err != nil {
		return apperr.Internal("Failed to load gallery item", err)
	}
	if item == nil {
		return apperr.NotFound("Gallery item not found")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return apperr.Internal("Failed to delete gallery item", err)
	}
	if item.ImageURL != "" {
		s.deleteImage(ctx, item.ImageURL)
	}
	return nil
}

func (s *Service) doUpload(ctx context.Context, image *multipart.FileHeader) (string, error) {
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
	if strings.TrimSpace(req.Caption) == "" {
		return apperr.BadRequest("Caption is required")
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

func toResponse(item *model.Gallery) Response {
	return Response{
		ID:        item.ID,
		Title:     item.Title,
		Caption:   item.Caption,
		Category:  item.Category,
		ImageURL:  item.ImageURL,
		Status:    item.Status,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}
