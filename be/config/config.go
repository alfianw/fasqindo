package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type StorageConfig struct {
	Endpoint  string
	Region    string
	Bucket    string
	AccessKey string
	SecretKey string
	PublicURL string
}

type Config struct {
	AppEnv        string
	AppPort       string
	DatabaseURL   string
	JWTSecret     string
	JWTExpires    time.Duration
	FrontendURLs  []string
	AdminEmail    string
	AdminPassword string
	Storage       StorageConfig
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required")
	}

	jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	appEnv := getEnv("APP_ENV", "development")
	if appEnv == "production" && jwtSecret == "change-me" {
		return nil, fmt.Errorf("JWT_SECRET must be changed when APP_ENV=production")
	}

	expiresRaw := getEnv("JWT_EXPIRES_IN", "24h")
	jwtExpires, err := time.ParseDuration(expiresRaw)
	if err != nil || jwtExpires <= 0 {
		return nil, fmt.Errorf("invalid JWT_EXPIRES_IN %q (expected e.g. 24h)", expiresRaw)
	}

	return &Config{
		AppEnv:        appEnv,
		AppPort:       getEnv("APP_PORT", "8080"),
		DatabaseURL:   databaseURL,
		JWTSecret:     jwtSecret,
		JWTExpires:    jwtExpires,
		FrontendURLs:  splitCSV(getEnv("FRONTEND_URL", "http://localhost:3000")),
		AdminEmail:    getEnv("ADMIN_EMAIL", "admin@fasqindo.com"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "password"),
		Storage: StorageConfig{
			Endpoint:  strings.TrimSpace(os.Getenv("STORAGE_ENDPOINT")),
			Region:    getEnv("STORAGE_REGION", "us-east-1"),
			Bucket:    strings.TrimSpace(os.Getenv("STORAGE_BUCKET")),
			AccessKey: strings.TrimSpace(os.Getenv("STORAGE_ACCESS_KEY")),
			SecretKey: strings.TrimSpace(os.Getenv("STORAGE_SECRET_KEY")),
			PublicURL: strings.TrimRight(strings.TrimSpace(os.Getenv("STORAGE_PUBLIC_URL")), "/"),
		},
	}, nil
}

func (c *Config) Address() string {
	return ":" + c.AppPort
}

func getEnv(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func splitCSV(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if p := strings.TrimRight(strings.TrimSpace(part), "/"); p != "" {
			out = append(out, p)
		}
	}
	return out
}
