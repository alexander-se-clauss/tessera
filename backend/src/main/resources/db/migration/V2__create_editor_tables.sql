CREATE TABLE project (
    id BIGSERIAL PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_owner_id ON project (owner_id);

CREATE TABLE tileset (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    image_url TEXT NOT NULL,
    tile_width INTEGER NOT NULL,
    tile_height INTEGER NOT NULL,
    columns INTEGER NOT NULL,
    rows INTEGER NOT NULL,
    margin INTEGER NOT NULL,
    spacing INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tileset_project_id ON tileset (project_id);

CREATE TABLE game_map (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES project (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    tile_width INTEGER NOT NULL,
    tile_height INTEGER NOT NULL,
    layers JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_map_project_id ON game_map (project_id);

CREATE TABLE map_event (
    id BIGSERIAL PRIMARY KEY,
    map_id BIGINT NOT NULL REFERENCES game_map (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    type VARCHAR(32) NOT NULL,
    icon_tile JSONB,
    properties JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_map_event_map_id ON map_event (map_id);
