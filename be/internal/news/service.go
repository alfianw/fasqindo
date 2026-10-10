package news

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
	Label    string `json:"label" form:"label"`
	Title    string `json:"title" form:"title"`
	Summary  string `json:"summary" form:"summary"`
	Details  string `json:"details" form:"details"`
	Category string `json:"category" form:"category"`
	Date     string `json:"date" form:"date"`
	Status   string `json:"status" form:"status"`
}

type Response struct {
	ID        uint      `json:"id"`
	Label     string    `json:"label"`
	Title     string    `json:"title"`
	Summary   string    `json:"summary"`
	Details   string    `json:"details"`
	Category  string    `json:"category"`
	Date      string    `json:"date"`
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

const imagePrefix = "news"

func (s *Service) List(ctx context.Context, publicOnly bool) ([]Response, error) {
	items, err := s.repo.List(ctx, publicOnly)
	if err != nil {
		return nil, apperr.Internal("Failed to load news", err)
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
		return nil, apperr.Internal("Failed to load news", err)
	}
	if item == nil {
		return nil, apperr.NotFound("News not found")
	}
	res := toResponse(item)
	return &res, nil
}

func (s *Service) Create(ctx context.Context, req Request, image *multipart.FileHeader) (*Response, error) {
	date, err := validate(req)
	if err != nil {
		return nil, err
	}
	status, err := normalizeStatus(req.Status, model.NewsDraft)
	if err != nil {
		return nil, err
	}

	item := &model.News{
		Label:    strings.TrimSpace(req.Label),
		Title:    strings.TrimSpace(req.Title),
		Summary:  strings.TrimSpace(req.Summary),
		Details:  strings.TrimSpace(req.Details),
		Category: strings.TrimSpace(req.Category),
		Date:     date,
		Status:   status,
	}

	imageURL, err := s.uploadImage(ctx, image)
	if err != nil {
		return nil, err
	}
	item.ImageURL = imageURL

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, apperr.Internal("Failed to create news", err)
	}
	res := toResponse(item)
	return &res, nil
}

func (s *Service) Update(ctx context.Context, id uint, req Request, image *multipart.FileHeader) (*Response, error) {
	item, err := s.repo.Find(ctx, id, false)
	if err != nil {
		return nil, apperr.Internal("Failed to load news", err)
	}
	if item == nil {
		return nil, apperr.NotFound("News not found")
	}
	date, err := validate(req)
	if err != nil {
		return nil, err
	}
	status, err := normalizeStatus(req.Status, item.Status)
	if err != nil {
		return nil, err
	}

	oldImageURL := item.ImageURL

	newImageURL, err := s.uploadImageReplace(ctx, image, oldImageURL)
	if err != nil {
		return nil, err
	}

	item.Label = strings.TrimSpace(req.Label)
	item.Title = strings.TrimSpace(req.Title)
	item.Summary = strings.TrimSpace(req.Summary)
	item.Details = strings.TrimSpace(req.Details)
	item.Category = strings.TrimSpace(req.Category)
	item.Date = date
	item.Status = status
	item.ImageURL = newImageURL

	if err := s.repo.Update(ctx, item); err != nil {
		return nil, apperr.Internal("Failed to update news", err)
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
		return apperr.Internal("Failed to load news", err)
	}
	if item == nil {
		return apperr.NotFound("News not found")
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return apperr.Internal("Failed to delete news", err)
	}
	if item.ImageURL != "" {
		s.deleteImage(ctx, item.ImageURL)
	}
	return nil
}

func (s *Service) uploadImage(ctx context.Context, image *multipart.FileHeader) (string, error) {
	if image == nil {
		return "", nil
	}
	return s.doUpload(ctx, image)
}

func (s *Service) uploadImageReplace(ctx context.Context, image *multipart.FileHeader, current string) (string, error) {
	if image == nil {
		return current, nil
	}
	return s.doUpload(ctx, image)
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

func validate(req Request) (time.Time, error) {
	if strings.TrimSpace(req.Title) == "" {
		return time.Time{}, apperr.BadRequest("Title is required")
	}
	if strings.TrimSpace(req.Summary) == "" {
		return time.Time{}, apperr.BadRequest("Summary is required")
	}
	if strings.TrimSpace(req.Details) == "" {
		return time.Time{}, apperr.BadRequest("Details is required")
	}
	date, ok := ParseDate(req.Date)
	if !ok {
		return time.Time{}, apperr.BadRequest("Invalid date, expected DD.MM.YYYY or YYYY-MM-DD")
	}
	return date, nil
}

func normalizeStatus(raw, fallback string) (string, error) {
	normalized := strings.ToUpper(strings.TrimSpace(raw))
	// accept the frontend display value "Published"/"Draft" too
	switch normalized {
	case "PUBLISHED", "PUBLISH":
		normalized = model.NewsPublished
	case "DRAFT":
		normalized = model.NewsDraft
	}
	if normalized == "" {
		return fallback, nil
	}
	if normalized != model.NewsPublished && normalized != model.NewsDraft {
		return "", apperr.BadRequest(fmt.Sprintf("Status must be %s or %s", model.NewsDraft, model.NewsPublished))
	}
	return normalized, nil
}

func toResponse(item *model.News) Response {
	return Response{
		ID:        item.ID,
		Label:     item.Label,
		Title:     item.Title,
		Summary:   item.Summary,
		Details:   item.Details,
		Category:  item.Category,
		Date:      FormatDate(item.Date),
		ImageURL:  item.ImageURL,
		Status:    item.Status,
		CreatedAt: item.CreatedAt,
		UpdatedAt: item.UpdatedAt,
	}
}
