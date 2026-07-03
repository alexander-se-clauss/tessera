package tessera.tile.backend.editor.model;

import java.util.List;

public record MapLayerData(
        Long id,
        String name,
        MapLayerType type,
        boolean visible,
        boolean locked,
        int order,
        List<TileCellData> tiles
) {
}
