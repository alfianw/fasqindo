package storage

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/url"
	"strings"

	"fasqindo-backend/config"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3Storage is the ObjectStorage implementation for any S3-compatible
// provider (MinIO, AWS S3, Cloudflare R2, Tencent COS, ...).
type S3Storage struct {
	client    *minio.Client
	bucket    string
	publicURL string
}

func NewS3Storage(cfg config.StorageConfig) (*S3Storage, error) {
	if cfg.Endpoint == "" || cfg.Bucket == "" || cfg.AccessKey == "" || cfg.SecretKey == "" || cfg.PublicURL == "" {
		return nil, fmt.Errorf("STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY and STORAGE_PUBLIC_URL are required")
	}

	endpoint, useSSL, err := normalizeEndpoint(cfg.Endpoint)
	if err != nil {
		return nil, err
	}

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: useSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("init storage client: %w", err)
	}

	return &S3Storage{
		client:    client,
		bucket:    cfg.Bucket,
		publicURL: strings.TrimRight(cfg.PublicURL, "/"),
	}, nil
}

func normalizeEndpoint(endpoint string) (host string, useSSL bool, err error) {
	raw := strings.TrimSpace(endpoint)
	useSSL = strings.HasPrefix(raw, "https://")
	raw = strings.TrimPrefix(raw, "http://")
	raw = strings.TrimPrefix(raw, "https://")

	u, err := url.Parse("scheme://" + raw)
	if err != nil || u.Host == "" {
		return "", false, fmt.Errorf("invalid STORAGE_ENDPOINT %q", endpoint)
	}
	return u.Host, useSSL, nil
}

// EnsureBucket creates the bucket when missing and makes objects publicly
// readable so image_url values returned to the frontend resolve directly.
func (s *S3Storage) EnsureBucket(ctx context.Context) error {
	exists, err := s.client.BucketExists(ctx, s.bucket)
	if err != nil {
		return fmt.Errorf("check bucket: %w", err)
	}
	if !exists {
		if err := s.client.MakeBucket(ctx, s.bucket, minio.MakeBucketOptions{}); err != nil {
			return fmt.Errorf("create bucket: %w", err)
		}
		slog.Info("storage bucket created", "bucket", s.bucket)
	}

	policy := fmt.Sprintf(
		`{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"AWS":["*"]},"Action":["s3:GetObject"],"Resource":["arn:aws:s3:::%s/*"]}]}`,
		s.bucket,
	)
	if err := s.client.SetBucketPolicy(ctx, s.bucket, policy); err != nil {
		slog.Warn("could not set public-read bucket policy; make objects readable manually if images 403",
			"bucket", s.bucket, "error", err)
	}
	return nil
}

func (s *S3Storage) Upload(ctx context.Context, file multipart.File, header *multipart.FileHeader, prefix string) (string, error) {
	if file == nil {
		return "", ErrNoFile
	}
	ext, err := ValidateImage(header)
	if err != nil {
		return "", err
	}

	key := ObjectKey(prefix, ext)
	contentType := contentTypeFor(ext)

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		return "", fmt.Errorf("rewind upload: %w", err)
	}

	_, err = s.client.PutObject(ctx, s.bucket, key, file, header.Size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("upload object: %w", err)
	}

	return fmt.Sprintf("%s/%s", s.publicURL, key), nil
}

func (s *S3Storage) Delete(ctx context.Context, objectKey string) error {
	if objectKey == "" {
		return nil
	}
	key := s.keyFromReference(objectKey)
	if key == "" {
		return fmt.Errorf("not a managed object reference: %q", objectKey)
	}
	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("delete object: %w", err)
	}
	return nil
}

// keyFromReference accepts either a full public URL or a bare storage key and
// returns the bare key.
func (s *S3Storage) keyFromReference(ref string) string {
	ref = strings.TrimSpace(ref)
	if strings.HasPrefix(ref, s.publicURL+"/") {
		return strings.TrimPrefix(ref, s.publicURL+"/")
	}
	if idx := strings.Index(ref, "services/"); idx >= 0 {
		return ref[idx:]
	}
	if idx := strings.Index(ref, "news/"); idx >= 0 {
		return ref[idx:]
	}
	if idx := strings.Index(ref, "gallery/"); idx >= 0 {
		return ref[idx:]
	}
	return ""
}

func contentTypeFor(ext string) string {
	switch ext {
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	default:
		return "image/jpeg"
	}
}
