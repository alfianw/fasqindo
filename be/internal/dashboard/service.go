package dashboard

import (
	"context"

	"fasqindo-backend/internal/apperr"
	"fasqindo-backend/internal/model"

	"gorm.io/gorm"
)

type Summary struct {
	TotalServices int64 `json:"totalServices"`
	TotalNews     int64 `json:"totalNews"`
	TotalGallery  int64 `json:"totalGallery"`
}

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// Summary returns counts only — no records (spec §13).
func (s *Service) Summary(ctx context.Context) (*Summary, error) {
	var out Summary

	if err := s.db.WithContext(ctx).Model(&model.Service{}).Count(&out.TotalServices).Error; err != nil {
		return nil, apperr.Internal("Failed to count services", err)
	}
	if err := s.db.WithContext(ctx).Model(&model.News{}).Count(&out.TotalNews).Error; err != nil {
		return nil, apperr.Internal("Failed to count news", err)
	}
	if err := s.db.WithContext(ctx).Model(&model.Gallery{}).Count(&out.TotalGallery).Error; err != nil {
		return nil, apperr.Internal("Failed to count gallery items", err)
	}
	return &out, nil
}
