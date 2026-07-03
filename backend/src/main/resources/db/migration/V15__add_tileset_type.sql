ALTER TABLE tileset
    ADD COLUMN IF NOT EXISTS type varchar(32) NOT NULL DEFAULT 'background';

UPDATE tileset
SET type = CASE
    WHEN metadata ->> 'type' = 'object' THEN 'object'
    ELSE 'background'
END;
