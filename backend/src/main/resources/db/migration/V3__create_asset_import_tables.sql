ALTER TABLE tileset
    ADD COLUMN asset_type VARCHAR(32) NOT NULL DEFAULT 'environment',
    ADD COLUMN source_import_id BIGINT,
    ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE asset_import (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    asset_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    tile_width INTEGER NOT NULL,
    tile_height INTEGER NOT NULL,
    source_image_path TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_asset_import_project_id ON asset_import (project_id);

ALTER TABLE tileset
    ADD CONSTRAINT fk_tileset_source_import
        FOREIGN KEY (source_import_id) REFERENCES asset_import (id) ON DELETE SET NULL;

CREATE TABLE extracted_tile (
    id BIGSERIAL PRIMARY KEY,
    import_id BIGINT NOT NULL REFERENCES asset_import (id) ON DELETE CASCADE,
    tile_index INTEGER NOT NULL,
    hash VARCHAR(128) NOT NULL,
    image_path TEXT NOT NULL,
    source_occurrences JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_extracted_tile_import_id ON extracted_tile (import_id);
CREATE UNIQUE INDEX uq_extracted_tile_import_index ON extracted_tile (import_id, tile_index);

CREATE TABLE tile_group (
    id BIGSERIAL PRIMARY KEY,
    import_id BIGINT NOT NULL REFERENCES asset_import (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(32) NOT NULL,
    category VARCHAR(32) NOT NULL,
    tile_refs JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tile_group_import_id ON tile_group (import_id);

CREATE TABLE tileset_tile (
    id BIGSERIAL PRIMARY KEY,
    tileset_id BIGINT NOT NULL REFERENCES tileset (id) ON DELETE CASCADE,
    extracted_tile_id BIGINT NOT NULL REFERENCES extracted_tile (id) ON DELETE RESTRICT,
    tile_index INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tileset_tile_tileset_id ON tileset_tile (tileset_id);
CREATE UNIQUE INDEX uq_tileset_tile_tileset_index ON tileset_tile (tileset_id, tile_index);
