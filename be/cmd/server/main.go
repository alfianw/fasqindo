package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"fasqindo-backend/config"
	"fasqindo-backend/internal/database"
	"fasqindo-backend/internal/router"
	"fasqindo-backend/internal/storage"
)

func main() {
	if err := run(); err != nil {
		slog.Error("fatal", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	slog.Info("starting Fasqindo backend",
		"env", cfg.AppEnv,
		"port", cfg.AppPort,
		"frontend", cfg.FrontendURLs,
	)

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		return err
	}

	// Migrations run automatically — tables are never created by hand.
	if err := database.Migrate(cfg.DatabaseURL); err != nil {
		return err
	}

	if err := database.SeedAdmin(db, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		return err
	}

	store, err := storage.NewS3Storage(cfg.Storage)
	if err != nil {
		return err
	}
	storageCtx, cancelStorage := context.WithTimeout(context.Background(), 15*time.Second)
	err = store.EnsureBucket(storageCtx)
	cancelStorage()
	if err != nil {
		return err
	}

	r := router.New(router.Deps{
		Cfg:     cfg,
		DB:      db,
		Storage: store,
	})

	srv := &http.Server{
		Addr:              cfg.Address(),
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		slog.Info("listening", "address", cfg.Address())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}
