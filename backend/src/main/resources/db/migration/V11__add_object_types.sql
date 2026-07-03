ALTER TABLE map_event
    ADD COLUMN object_type_id UUID;

CREATE TABLE object_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id BIGINT NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    tileset_id BIGINT NOT NULL REFERENCES tileset(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(32) NOT NULL,
    span_x INT NOT NULL DEFAULT 1,
    span_y INT NOT NULL DEFAULT 1,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_object_type_project_id ON object_type(project_id);
