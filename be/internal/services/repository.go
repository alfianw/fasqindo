package services

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

// List returns services. When publicOnly is true only ACTIVE records are
// returned (public website); admins see everything.
func (r *Repository) List(ctx context.Context, publicOnly bool) ([]model.Service, error) {
	q := r.db.WithContext(ctx).Order("created_at DESC, id DESC")
	if publicOnly {
		q = q.Where("status = ?", model.StatusActive)
	}
	var items []model.Service
	err := q.Find(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (r *Repository) Find(ctx context.Context, id uint, publicOnly bool) (*model.Service, error) {
	q := r.db.WithContext(ctx).Where("id = ?", id)
	if publicOnly {
		q = q.Where("status = ?", model.StatusActive)
	}
	var item model.Service
	err := q.First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *Repository) Create(ctx context.Context, item *model.Service) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *Repository) Update(ctx context.Context, item *model.Service) error {
	return r.db.WithContext(ctx).Save(item).Error
}

func (r *Repository) Delete(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Delete(&model.Service{}, id).Error
}
