package auth

import (
	"context"
	"errors"
	"strings"

	"fasqindo-backend/internal/apperr"

	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserResponse struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type LoginResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type Service struct {
	repo   *Repository
	tokens *TokenManager
}

func NewService(repo *Repository, tokens *TokenManager) *Service {
	return &Service{repo: repo, tokens: tokens}
}

func (s *Service) Login(ctx context.Context, req LoginRequest) (*LoginResponse, error) {
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		return nil, apperr.BadRequest("Email and password are required")
	}

	user, err := s.repo.FindByEmail(ctx, req.Email)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return nil, apperr.Unauthorized("Invalid email or password")
		}
		return nil, apperr.Internal("Failed to login", err)
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)) != nil {
		return nil, apperr.Unauthorized("Invalid email or password")
	}

	token, err := s.tokens.Generate(user.ID, user.Name, user.Email, user.Role)
	if err != nil {
		return nil, apperr.Internal("Failed to issue token", err)
	}

	return &LoginResponse{
		Token: token,
		User: UserResponse{
			ID:    user.ID,
			Name:  user.Name,
			Email: user.Email,
			Role:  user.Role,
		},
	}, nil
}

func (s *Service) ChangePassword(ctx context.Context, userID uint, req ChangePasswordRequest) error {
	if req.CurrentPassword == "" || req.NewPassword == "" {
		return apperr.BadRequest("Current and new password are required")
	}
	if len(req.NewPassword) < 6 {
		return apperr.BadRequest("New password must be at least 6 characters")
	}

	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return apperr.Unauthorized("Account not found")
		}
		return apperr.Internal("Failed to load account", err)
	}

	if bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)) != nil {
		return apperr.BadRequest("Current password is incorrect")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return apperr.Internal("Failed to hash password", err)
	}

	if err := s.repo.UpdatePassword(ctx, user.ID, string(hash)); err != nil {
		return apperr.Internal("Failed to update password", err)
	}
	return nil
}
