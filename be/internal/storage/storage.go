package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

const MaxUploadBytes = 5 << 20 // 5 MB

var (
	ErrUnsupportedType = errors.New("unsupported image type, allowed: JPG/JPEG, PNG, WebP")
	ErrFileTooLarge    = errors.New("image exceeds the maximum allowed size of 5 MB")
	ErrNoFile          = errors.New("no image file provided")
)

// ObjectStorage abstracts the image storage provider so the backend can run
// against MinIO, AWS S3, Cloudflare R2, Tencent COS, or any S3-compatible API.
type ObjectStorage interface {
	// Upload stores the image under {prefix}/{uuid}{ext} and returns the
	// public URL that should be persisted in the database.
	Upload(ctx context.Context, file multipart.File, header *multipart.FileHeader, prefix string) (string, error)
	// Delete removes the object identified by the given public URL/key.
	Delete(ctx context.Context, objectKey string) error
}

// ValidateImage checks size and content type (by magic bytes, not extension).
// It returns a canonical extension including the leading dot, e.g. ".webp".
func ValidateImage(header *multipart.FileHeader) (string, error) {
	if header == nil {
		return "", ErrNoFile
	}
	if header.Size > MaxUploadBytes {
		return "", ErrFileTooLarge
	}
	if header.Size == 0 {
		return "", ErrNoFile
	}

	file, err := header.Open()
	if err != nil {
		return "", fmt.Errorf("open upload: %w", err)
	}
	defer file.Close()

	head := make([]byte, 12)
	if _, err := io.ReadFull(file, head); err != nil {
		return "", fmt.Errorf("read upload: %w", err)
	}

	ext, ok := sniffImage(head)
	if !ok {
		return "", ErrUnsupportedType
	}

	if filepath.Ext(strings.ToLower(header.Filename)) == ".gif" {
		return "", ErrUnsupportedType
	}
	return ext, nil
}

func sniffImage(head []byte) (string, bool) {
	switch {
	case len(head) >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF:
		return ".jpg", true
	case len(head) >= 8 &&
		head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47 &&
		head[4] == 0x0D && head[5] == 0x0A && head[6] == 0x1A && head[7] == 0x0A:
		return ".png", true
	case len(head) >= 12 &&
		string(head[0:4]) == "RIFF" && string(head[8:12]) == "WEBP":
		return ".webp", true
	default:
		return "", false
	}
}

// ObjectKey builds a collision-safe storage key such as "services/<uuid>.webp".
// The original filename is never trusted as the storage key.
func ObjectKey(prefix, ext string) string {
	prefix = strings.Trim(strings.ReplaceAll(prefix, "\\", "/"), "/")
	return fmt.Sprintf("%s/%s%s", prefix, uuid.NewString(), ext)
}

// IsObjectKey reports whether raw looks like a storage key/URL we manage
// (i.e. it lives under one of the known upload prefixes).
func IsObjectKey(raw string) bool {
	for _, p := range []string{"services/", "news/", "gallery/"} {
		if strings.Contains(raw, p) {
			return true
		}
	}
	return false
}

// LocalTempReader is a helper used by tests to build multipart uploads.
func LocalTempReader(path string) (multipart.File, *multipart.FileHeader, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, nil, err
	}
	info, err := f.Stat()
	if err != nil {
		f.Close()
		return nil, nil, err
	}
	header := &multipart.FileHeader{
		Filename: filepath.Base(path),
		Size:     info.Size(),
	}
	return f, header, nil
}
