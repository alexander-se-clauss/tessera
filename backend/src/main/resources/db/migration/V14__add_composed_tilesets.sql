ALTER TABLE tileset
    ADD COLUMN IF NOT EXISTS composed_width integer NOT NULL DEFAULT 256,
    ADD COLUMN IF NOT EXISTS composed_height integer NOT NULL DEFAULT 16,
    ADD COLUMN IF NOT EXISTS tile_map jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS editor_groups jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE tileset
SET composed_height = GREATEST(1, rows) * tile_height
WHERE composed_height = 16 AND rows > 0 AND tile_height > 0;
