ALTER TABLE game_map
    ADD COLUMN spawn_point JSONB NOT NULL DEFAULT '{"x":0,"y":0}'::jsonb;

ALTER TABLE project
    ADD COLUMN entry_point JSONB;
