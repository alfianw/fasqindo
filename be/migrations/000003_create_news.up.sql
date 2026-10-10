CREATE TABLE IF NOT EXISTS news (
    id          BIGSERIAL PRIMARY KEY,
    label       VARCHAR(120)  NOT NULL DEFAULT '',
    title       VARCHAR(255)  NOT NULL,
    summary     TEXT          NOT NULL,
    details     TEXT          NOT NULL,
    category    VARCHAR(80)   NOT NULL DEFAULT '',
    date        DATE          NOT NULL,
    image_url   TEXT          NOT NULL DEFAULT '',
    status      VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT news_status_check CHECK (status IN ('DRAFT', 'PUBLISHED'))
);

CREATE INDEX IF NOT EXISTS idx_news_status ON news (status);
CREATE INDEX IF NOT EXISTS idx_news_date ON news (date DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news (category);
