package database

import (
	"log/slog"

	"fasqindo-backend/internal/model"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// SeedAdmin creates the initial admin account when the users table is empty.
// Credentials come from ADMIN_EMAIL / ADMIN_PASSWORD environment variables.
func SeedAdmin(db *gorm.DB, email, password string) error {
	var count int64
	if err := db.Model(&model.User{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	admin := model.User{
		Name:     "Admin Mandiri",
		Email:    email,
		Password: string(hash),
		Role:     model.RoleAdmin,
	}
	if err := db.Create(&admin).Error; err != nil {
		return err
	}

	slog.Info("seeded admin user", "email", email)
	return nil
}
