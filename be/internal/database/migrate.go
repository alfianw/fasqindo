package database

import (
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"fasqindo-backend/migrations"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

// Migrate applies all embedded SQL migrations. Tables are created
// automatically — no manual steps required.
func Migrate(databaseURL string) error {
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("open migration source: %w", err)
	}

	m, err := migrate.NewWithSourceInstance("iofs", source, withDefaultSSLMode(databaseURL))
	if err != nil {
		return fmt.Errorf("init migrator: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("apply migrations: %w", err)
	}

	slog.Info("database migrations up to date")
	return nil
}

// withDefaultSSLMode adds sslmode=disable when the URL does not specify one,
// so migrations work against local dev databases without TLS.
func withDefaultSSLMode(databaseURL string) string {
	if strings.Contains(databaseURL, "sslmode=") {
		return databaseURL
	}
	sep := "?"
	if strings.Contains(databaseURL, "?") {
		sep = "&"
	}
	return databaseURL + sep + "sslmode=disable"
}
