package tessera.tile.backend.editor.model;

import java.util.Map;
import java.util.UUID;

public record MapObjectData(
        UUID id,
        UUID objectTypeId,
        int x,
        int y,
        Map<String, Object> properties
) {
}
