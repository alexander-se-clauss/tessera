UPDATE object_type
SET config =
    jsonb_build_object(
        'visual',
        COALESCE(config -> 'visual', jsonb_build_object('tileIndex', 0))
            || jsonb_build_object('spanX', span_x, 'spanY', span_y),
        'defaultSolid',
        COALESCE(config -> 'defaultSolid', 'true'::jsonb)
    )
    || CASE WHEN config ? 'animation' THEN jsonb_build_object('animation', config -> 'animation') ELSE '{}'::jsonb END
    || CASE WHEN config ? 'states' THEN jsonb_build_object('states', config -> 'states') ELSE '{}'::jsonb END
    || CASE WHEN config ? 'defaultState' THEN jsonb_build_object('defaultState', config -> 'defaultState') ELSE '{}'::jsonb END;
