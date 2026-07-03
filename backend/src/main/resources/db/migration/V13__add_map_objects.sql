ALTER TABLE game_map
    ADD COLUMN objects JSONB NOT NULL DEFAULT '[]'::jsonb;
