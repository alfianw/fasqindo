package router

import (
	"fasqindo-backend/config"
	"fasqindo-backend/internal/apperr"
	"fasqindo-backend/internal/auth"
	"fasqindo-backend/internal/dashboard"
	"fasqindo-backend/internal/gallery"
	"fasqindo-backend/internal/middleware"
	"fasqindo-backend/internal/news"
	"fasqindo-backend/internal/services"
	"fasqindo-backend/internal/storage"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Deps struct {
	Cfg     *config.Config
	DB      *gorm.DB
	Storage storage.ObjectStorage
}

func New(deps Deps) *gin.Engine {
	if deps.Cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(middleware.CORS(deps.Cfg.FrontendURLs))

	tokens := auth.NewTokenManager(deps.Cfg.JWTSecret, deps.Cfg.JWTExpires)
	requireAdmin := auth.RequireAdmin(tokens)
	attachAdmin := auth.AttachAdmin(tokens)

	// ---- auth ----
	authRepo := auth.NewRepository(deps.DB)
	authSvc := auth.NewService(authRepo, tokens)
	authHandler := auth.NewHandler(authSvc)

	// ---- modules ----
	servicesHandler := services.NewHandler(services.NewService(services.NewRepository(deps.DB), deps.Storage))
	newsHandler := news.NewHandler(news.NewService(news.NewRepository(deps.DB), deps.Storage))
	galleryHandler := gallery.NewHandler(gallery.NewService(gallery.NewRepository(deps.DB), deps.Storage))
	dashboardHandler := dashboard.NewHandler(dashboard.NewService(deps.DB))

	api := r.Group("/api")
	{
		api.POST("/auth/login", authHandler.Login)
		api.PUT("/auth/password", requireAdmin, authHandler.ChangePassword)

		// services — public GET, admin CRUD
		api.GET("/services", attachAdmin, servicesHandler.List)
		api.GET("/services/:id", attachAdmin, servicesHandler.Get)
		api.POST("/services", requireAdmin, servicesHandler.Create)
		api.PUT("/services/:id", requireAdmin, servicesHandler.Update)
		api.DELETE("/services/:id", requireAdmin, servicesHandler.Delete)

		// news
		api.GET("/news", attachAdmin, newsHandler.List)
		api.GET("/news/:id", attachAdmin, newsHandler.Get)
		api.POST("/news", requireAdmin, newsHandler.Create)
		api.PUT("/news/:id", requireAdmin, newsHandler.Update)
		api.DELETE("/news/:id", requireAdmin, newsHandler.Delete)

		// gallery
		api.GET("/gallery", attachAdmin, galleryHandler.List)
		api.GET("/gallery/:id", attachAdmin, galleryHandler.Get)
		api.POST("/gallery", requireAdmin, galleryHandler.Create)
		api.PUT("/gallery/:id", requireAdmin, galleryHandler.Update)
		api.DELETE("/gallery/:id", requireAdmin, galleryHandler.Delete)

		// dashboard
		api.GET("/dashboard/summary", requireAdmin, dashboardHandler.Summary)
	}

	// unknown routes still return the standard envelope
	r.NoRoute(func(c *gin.Context) {
		apperr.Abort(c, apperr.NotFound("Endpoint not found"))
	})
	r.NoMethod(func(c *gin.Context) {
		apperr.Abort(c, apperr.NotFound("Method not allowed"))
	})

	return r
}
