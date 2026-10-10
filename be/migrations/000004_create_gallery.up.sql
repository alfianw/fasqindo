CREATE TABLE IF NOT EXISTS gallery (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(190)  NOT NULL,
    caption     TEXT          NOT NULL,
    category    VARCHAR(80)   NOT NULL DEFAULT '',
    image_url   TEXT          NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT gallery_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IF NOT EXISTS idx_gallery_category ON gallery (category);
CREATE INDEX IF NOT EXISTS idx_gallery_created_at ON gallery (created_at DESC);
