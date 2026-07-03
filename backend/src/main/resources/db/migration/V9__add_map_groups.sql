-- Create map_groups table
CREATE TABLE map_groups (
    id           BIGSERIAL    PRIMARY KEY,
    project_id   BIGINT       NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    type         VARCHAR(20)  NOT NULL DEFAULT 'world',
    is_overworld BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create a default world group for every existing project
INSERT INTO map_groups (project_id, name, type, is_overworld)
SELECT id, 'World', 'world', TRUE FROM project;

-- Add group placement columns to game_map
ALTER TABLE game_map
    ADD COLUMN map_group_id BIGINT REFERENCES map_groups(id) ON DELETE SET NULL,
    ADD COLUMN grid_col     INTEGER,
    ADD COLUMN grid_row     INTEGER;

-- Assign all existing maps to their project's world group (unplaced)
UPDATE game_map gm
SET map_group_id = mg.id
FROM map_groups mg
WHERE mg.project_id = gm.project_id;

-- Migrate overworld grid positions from project.overworld_grid JSONB
UPDATE game_map gm
SET
    grid_col = (
        SELECT (entry->>'col')::INT
        FROM project p, jsonb_array_elements(p.overworld_grid) AS entry
        WHERE p.id = gm.project_id
          AND (entry->>'mapId')::BIGINT = gm.id
        LIMIT 1
    ),
    grid_row = (
        SELECT (entry->>'row')::INT
        FROM project p, jsonb_array_elements(p.overworld_grid) AS entry
        WHERE p.id = gm.project_id
          AND (entry->>'mapId')::BIGINT = gm.id
        LIMIT 1
    )
WHERE EXISTS (
    SELECT 1 FROM project p
    WHERE p.id = gm.project_id
      AND p.overworld_grid IS NOT NULL
      AND jsonb_array_length(p.overworld_grid) > 0
);

-- Add overworld_group_id to project
ALTER TABLE project
    ADD COLUMN overworld_group_id BIGINT REFERENCES map_groups(id) ON DELETE SET NULL;

UPDATE project p
SET overworld_group_id = mg.id
FROM map_groups mg
WHERE mg.project_id = p.id AND mg.is_overworld = TRUE;

-- Drop old columns from game_map
ALTER TABLE game_map
    DROP COLUMN IF EXISTS map_type,
    DROP COLUMN IF EXISTS parent_map_id,
    DROP COLUMN IF EXISTS overworld_position;

-- Drop old columns from project
ALTER TABLE project
    DROP COLUMN IF EXISTS overworld_id,
    DROP COLUMN IF EXISTS overworld_grid;
