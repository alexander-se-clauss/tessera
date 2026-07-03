package tessera.tile.backend.editor;

import tessera.tile.backend.editor.EditorDtos.EventResponse;
import tessera.tile.backend.editor.EditorDtos.ExtractedTileResponse;
import tessera.tile.backend.editor.EditorDtos.IconTileRequest;
import tessera.tile.backend.editor.EditorDtos.LayerRequest;
import tessera.tile.backend.editor.EditorDtos.MapGroupResponse;
import tessera.tile.backend.editor.EditorDtos.MapResponse;
import tessera.tile.backend.editor.EditorDtos.ObjectTypeResponse;
import tessera.tile.backend.editor.EditorDtos.ProjectResponse;
import tessera.tile.backend.editor.EditorDtos.TileCellRequest;
import tessera.tile.backend.editor.EditorDtos.TileGroupResponse;
import tessera.tile.backend.editor.EditorDtos.TilesetResponse;
import tessera.tile.backend.editor.EditorDtos.TilesetTileResponse;
import tessera.tile.backend.editor.model.AssetImportEntity;
import tessera.tile.backend.editor.model.ExtractedTileEntity;
import tessera.tile.backend.editor.model.GameMapEntity;
import tessera.tile.backend.editor.model.IconTileData;
import tessera.tile.backend.editor.model.MapEventEntity;
import tessera.tile.backend.editor.model.MapGroupEntity;
import tessera.tile.backend.editor.model.MapLayerData;
import tessera.tile.backend.editor.model.ObjectTypeEntity;
import tessera.tile.backend.editor.model.ProjectEntity;
import tessera.tile.backend.editor.model.TileGroupEntity;
import tessera.tile.backend.editor.model.TileCellData;
import tessera.tile.backend.editor.model.TilesetEntity;
import tessera.tile.backend.editor.model.TilesetTileEntity;
import java.util.List;
import java.util.Map;

final class EditorMapper {

    private EditorMapper() {
    }

    static ProjectResponse toProjectResponse(ProjectEntity project) {
        return new ProjectResponse(
                project.getId(),
                project.getOwner().getId(),
                project.getName(),
                project.getDescription(),
                project.getEntryPoint(),
                project.getPlayerConfig(),
                project.getOverworldGroupId(),
                project.getCreatedAt(),
                project.getUpdatedAt()
        );
    }

    static MapResponse toMapResponse(GameMapEntity map) {
        return new MapResponse(
                map.getId(),
                map.getProject().getId(),
                map.getName(),
                map.getWidth(),
                map.getHeight(),
                map.getTileWidth(),
                map.getTileHeight(),
                map.getLayers(),
                map.getObjects(),
                map.getSpawnPoint(),
                map.getMapGroupId(),
                map.getGridCol(),
                map.getGridRow(),
                map.getCreatedAt(),
                map.getUpdatedAt()
        );
    }

    static MapGroupResponse toMapGroupResponse(MapGroupEntity group) {
        return new MapGroupResponse(
                group.getId(),
                group.getProject().getId(),
                group.getName(),
                group.getType(),
                group.isOverworld(),
                group.getMinCols(),
                group.getMinRows(),
                group.getCreatedAt(),
                group.getUpdatedAt()
        );
    }

    static TilesetResponse toTilesetResponse(
            TilesetEntity tileset,
            List<TilesetTileEntity> tiles,
            List<TileGroupEntity> groups
    ) {
        return new TilesetResponse(
                tileset.getId(),
                tileset.getProject().getId(),
                tileset.getName(),
                tileset.getImageUrl(),
                tileset.getAssetType(),
                tileset.getType(),
                tileset.getTileWidth(),
                tileset.getTileHeight(),
                tileset.getColumns(),
                tileset.getRows(),
                tileset.getComposedWidth(),
                tileset.getComposedHeight(),
                tileset.getMargin(),
                tileset.getSpacing(),
                tileset.getSourceImport() == null ? null : tileset.getSourceImport().getId(),
                tileset.getMetadata(),
                tileset.getTileMap(),
                tiles.stream().map(EditorMapper::toTilesetTileResponse).toList(),
                tileset.getEditorGroups().isEmpty()
                        ? groups.stream().map(EditorMapper::toLegacyGroupMap).toList()
                        : tileset.getEditorGroups(),
                tileset.getCreatedAt(),
                tileset.getUpdatedAt()
        );
    }

    private static Map<String, Object> toLegacyGroupMap(TileGroupEntity group) {
        return Map.of(
                "id", group.getId(),
                "name", group.getName(),
                "type", group.getType().getValue(),
                "category", group.getCategory().name(),
                "tileRefs", group.getTileRefs(),
                "metadata", group.getMetadata() == null ? Map.of() : group.getMetadata(),
                "orderIndex", group.getOrderIndex()
        );
    }

    static EditorDtos.AssetImportResponse toAssetImportResponse(
            AssetImportEntity assetImport,
            List<ExtractedTileEntity> tiles,
            List<TileGroupEntity> groups
    ) {
        return new EditorDtos.AssetImportResponse(
                assetImport.getId(),
                assetImport.getProject().getId(),
                assetImport.getName(),
                assetImport.getAssetType(),
                assetImport.getStatus(),
                assetImport.getTileWidth(),
                assetImport.getTileHeight(),
                assetImport.getSourceImagePath(),
                assetImport.getMetadata() == null ? Map.of() : assetImport.getMetadata(),
                tiles.stream().map(EditorMapper::toExtractedTileResponse).toList(),
                groups.stream().map(EditorMapper::toTileGroupResponse).toList()
        );
    }

    static EventResponse toEventResponse(MapEventEntity event) {
        return new EventResponse(
                event.getId(),
                event.getMap().getId(),
                event.getName(),
                event.getX(),
                event.getY(),
                event.getType(),
                event.getIconTile(),
                event.getProperties(),
                event.getObjectTypeId(),
                event.getCreatedAt(),
                event.getUpdatedAt()
        );
    }

    static ObjectTypeResponse toObjectTypeResponse(ObjectTypeEntity objectType) {
        return new ObjectTypeResponse(
                objectType.getId(),
                objectType.getProject().getId(),
                objectType.getTilesetId(),
                objectType.getName(),
                objectType.getCategory(),
                objectType.getSpanX(),
                objectType.getSpanY(),
                objectType.getConfig() == null ? Map.of() : objectType.getConfig(),
                objectType.getCreatedAt(),
                objectType.getUpdatedAt()
        );
    }

    static ExtractedTileResponse toExtractedTileResponse(ExtractedTileEntity tile) {
        return new ExtractedTileResponse(
                tile.getId(),
                tile.getTileIndex(),
                tile.getHash(),
                tile.getImagePath(),
                tile.getSourceOccurrences()
        );
    }

    static TileGroupResponse toTileGroupResponse(TileGroupEntity group) {
        return new TileGroupResponse(
                group.getId(),
                group.getName(),
                group.getType(),
                group.getCategory(),
                group.getTileRefs(),
                group.getMetadata() == null ? Map.of() : group.getMetadata(),
                group.getOrderIndex()
        );
    }

    static TilesetTileResponse toTilesetTileResponse(TilesetTileEntity tile) {
        return new TilesetTileResponse(
                tile.getId(),
                tile.getExtractedTile().getId(),
                tile.getTileIndex(),
                tile.getImagePath(),
                tile.getMetadata() == null ? Map.of() : tile.getMetadata()
        );
    }

    static List<MapLayerData> toLayerDataList(List<LayerRequest> layers) {
        return layers.stream()
                .map(EditorMapper::toLayerData)
                .toList();
    }

    static MapLayerData toLayerData(LayerRequest request) {
        return new MapLayerData(
                request.id(),
                request.name().trim(),
                request.type(),
                request.visible(),
                request.locked(),
                request.order(),
                request.tiles() == null ? List.of() : request.tiles().stream().map(EditorMapper::toTileCellData).toList()
        );
    }

    static TileCellData toTileCellData(TileCellRequest request) {
        return new TileCellData(request.x(), request.y(), request.tilesetId(), request.tileIndex());
    }

    static IconTileData toIconTileData(IconTileRequest request) {
        return request == null ? null : new IconTileData(request.tilesetId(), request.tileIndex());
    }
}
