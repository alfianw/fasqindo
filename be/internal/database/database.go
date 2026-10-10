package database

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect opens the GORM connection and retries until PostgreSQL is ready
// (useful while the Docker container is still starting).
func Connect(dsn string) (*gorm.DB, error) {
	var db *gorm.DB
	var err error

	backoff := time.Second
	for attempt := 1; attempt <= 15; attempt++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Warn),
		})
		if err == nil {
			sqlDB, pingErr := db.DB()
			if pingErr == nil {
				ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
				pingErr = sqlDB.PingContext(ctx)
				cancel()
			}
			if pingErr == nil {
				sqlDB.SetMaxOpenConns(20)
				sqlDB.SetMaxIdleConns(5)
				sqlDB.SetConnMaxLifetime(time.Hour)
				return db, nil
			}
			err = pingErr
		}
		slog.Warn("database not ready, retrying", "attempt", attempt, "error", err)
		time.Sleep(backoff)
		if backoff < 5*time.Second {
			backoff *= 2
		}
	}
	return nil, fmt.Errorf("connect database: %w", err)
}
