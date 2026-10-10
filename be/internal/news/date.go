package news

import (
	"strings"
	"time"
)

// The frontend displays dates as DD.MM.YYYY (e.g. "08.06.2026").
const displayLayout = "02.01.2006"

// FormatDate converts a stored date to the frontend display format.
func FormatDate(t time.Time) string {
	if t.IsZero() {
		return ""
	}
	return t.In(time.Local).Format(displayLayout)
}

// ParseDate accepts both the frontend display format (DD.MM.YYYY) and
// ISO-8601 (YYYY-MM-DD).
func ParseDate(raw string) (time.Time, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Time{}, false
	}
	for _, layout := range []string{displayLayout, "2006-01-02"} {
		if t, err := time.ParseInLocation(layout, raw, time.Local); err == nil {
			return t, true
		}
	}
	return time.Time{}, false
}
