package news

import (
	"context"
	"errors"

	"fasqindo-backend/internal/model"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// List returns news ordered by display date (newest first). When publicOnly
// is true only PUBLISHED records are returned.
func (r *Repository) List(ctx context.Context, publicOnly bool) ([]model.News, error) {
	q := r.db.WithContext(ctx).Order("date DESC, id DESC")
	if publicOnly {
		q = q.Where("status = ?", model.NewsPublished)
	}
	var items []model.News
	err := q.Find(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repository) Find(ctx context.Context, id uint, publicOnly bool) (*model.News, error) {
	q := r.db.WithContext(ctx).Where("id = ?", id)
	if publicOnly {
		q = q.Where("status = ?", model.NewsPublished)
	}
	var item model.News
	err := q.First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) Create(ctx context.Context, item *model.News) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *Repository) Update(ctx context.Context, item *model.News) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.News{}, id).Error
}
