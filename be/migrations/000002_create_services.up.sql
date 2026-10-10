CREATE TABLE IF NOT EXISTS services (
    id          BIGSERIAL PRIMARY KEY,
    title       VARCHAR(190)  NOT NULL,
    description TEXT          NOT NULL,
    details     TEXT          NOT NULL,
    icon        VARCHAR(80)   NOT NULL DEFAULT '',
    image_url   TEXT          NOT NULL DEFAULT '',
    status      VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT services_status_check CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IF NOT EXISTS idx_services_status ON services (status);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services (created_at DESC);
