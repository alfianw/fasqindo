package webbind

import (
	"mime/multipart"

	"github.com/gin-gonic/gin"
)

// Parse binds a request that may be either multipart/form-data or JSON into
// out (structs should carry both `json` and `form` tags). It returns the
// multipart form (nil for JSON) and the optional "image" file, so callers can
// extract the uploaded image without caring about the content type.
func Parse(c *gin.Context, out any) (*multipart.Form, *multipart.FileHeader, error) {
	if isMultipart(c) {
		if err := c.Request.ParseMultipartForm(6 << 20); err != nil {
			return nil, nil, err
		}
		form := c.Request.MultipartForm
		if err := c.ShouldBind(out); err != nil {
			return form, nil, err
		}
		return form, firstFile(form, "image"), nil
	}

	if err := c.ShouldBindJSON(out); err != nil {
		return nil, nil, err
	}
	return nil, nil, nil
}

func isMultipart(c *gin.Context) bool {
	ct := c.ContentType()
	return ct == "multipart/form-data"
}

func firstFile(form *multipart.Form, key string) *multipart.FileHeader {
	if form == nil || form.File == nil {
		return nil
	}
	files := form.File[key]
	if len(files) == 0 {
		return nil
	}
	return files[0]
}

// Value returns the first value of a multipart form field, or "".
func Value(form *multipart.Form, key string) string {
	if form == nil || form.Value == nil {
		return ""
	}
	if vals, ok := form.Value[key]; ok && len(vals) > 0 {
		return vals[0]
	}
	return ""
}
