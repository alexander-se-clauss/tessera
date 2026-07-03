package tessera.tile.backend.editor.model;

public record TileCellData(
        int x,
        int y,
        Long tilesetId,
        int tileIndex
) {
}
