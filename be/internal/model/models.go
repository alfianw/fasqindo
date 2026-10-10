package model

import "time"

const (
	StatusActive   = "ACTIVE"
	StatusInactive = "INACTIVE"

	NewsDraft     = "DRAFT"
	NewsPublished = "PUBLISHED"

	RoleAdmin = "ADMIN"
)

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:120;not null" json:"name"`
	Email     string    `gorm:"size:190;uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"size:100;not null" json:"-"`
	Role      string    `gorm:"size:20;not null;default:ADMIN" json:"role"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (User) TableName() string { return "users" }

type Service struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"size:190;not null" json:"title"`
	Description string    `gorm:"type:text;not null" json:"description"`
	Details     string    `gorm:"type:text;not null" json:"details"`
	Icon        string    `gorm:"size:80;not null;default:''" json:"icon"`
	ImageURL    string    `gorm:"column:image_url;type:text;not null;default:''" json:"image_url"`
	Status      string    `gorm:"size:20;not null;default:ACTIVE;index" json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (Service) TableName() string { return "services" }

type News struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Label     string    `gorm:"size:120;not null;default:''" json:"label"`
	Title     string    `gorm:"size:255;not null" json:"title"`
	Summary   string    `gorm:"type:text;not null" json:"summary"`
	Details   string    `gorm:"type:text;not null" json:"details"`
	Category  string    `gorm:"size:80;not null;default:''" json:"category"`
	Date      time.Time `gorm:"column:date;type:date" json:"date"`
	ImageURL  string    `gorm:"column:image_url;type:text;not null;default:''" json:"image_url"`
	Status    string    `gorm:"size:20;not null;default:DRAFT;index" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (News) TableName() string { return "news" }

type Gallery struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Title     string    `gorm:"size:190;not null" json:"title"`
	Caption   string    `gorm:"type:text;not null" json:"caption"`
	Category  string    `gorm:"size:80;not null;default:'';index" json:"category"`
	ImageURL  string    `gorm:"column:image_url;type:text;not null;default:''" json:"image_url"`
	Status    string    `gorm:"size:20;not null;default:ACTIVE" json:"status"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (Gallery) TableName() string { return "gallery" }
