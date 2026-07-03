package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.EntryPointData;
import tessera.tile.backend.editor.model.IconTileData;
import tessera.tile.backend.editor.model.AssetImportStatus;
import tessera.tile.backend.editor.model.AssetType;
import tessera.tile.backend.editor.model.MapEventType;
import tessera.tile.backend.editor.model.MapLayerData;
import tessera.tile.backend.editor.model.MapLayerType;
import tessera.tile.backend.editor.model.PlayerConfigData;
import tessera.tile.backend.editor.model.SourceOccurrenceData;
import tessera.tile.backend.editor.model.SpawnPointData;
import tessera.tile.backend.editor.model.TileGroupCategory;
import tessera.tile.backend.editor.model.TileRefData;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class EditorDtos {

    private EditorDtos() {
    }

    public record SpawnPointRequest(
            @Min(value = 0, message = "Spawn point x must be at least 0.")
            int x,
            @Min(value = 0, message = "Spawn point y must be at least 0.")
            int y
    ) {
    }

    public record EntryPointRequest(
            @NotNull(message = "Entry point mapId is required.")
            Long mapId,
            @Min(value = 0, message = "Entry point x must be at least 0.")
            int x,
            @Min(value = 0, message = "Entry point y must be at least 0.")
            int y
    ) {
    }

    public record CollisionBoxRequest(
            @Min(value = 1, message = "Collision box width must be at least 1.")
            int width,
            @Min(value = 1, message = "Collision box height must be at least 1.")
            int height,
            @Min(value = 0, message = "Collision box offsetX must be at least 0.")
            int offsetX,
            @Min(value = 0, message = "Collision box offsetY must be at least 0.")
            int offsetY
    ) {
    }

    public record PlayerConfigRequest(
            @NotNull(message = "Player spriteId is required.")
            Long spriteId,
            @DecimalMin(value = "0.1", message = "Move speed must be at least 0.1.")
            @DecimalMax(value = "20.0", message = "Move speed must be at most 20.")
            double moveSpeed,
            @Valid
            @NotNull(message = "Collision box is required.")
            CollisionBoxRequest collisionBox,
            MirrorMovementsRequest mirrorMovements
    ) {
    }

    public record MirrorMovementsRequest(
            boolean leftToRight,
            boolean rightToLeft
    ) {
    }

    public record GroupNeighborCell(Long mapId, String mapName, int col, int row) {
    }

    public record GroupNeighborsResponse(
            GroupNeighborCell north,
            GroupNeighborCell south,
            GroupNeighborCell east,
            GroupNeighborCell west
    ) {
    }

    public record ProjectRequest(
            @NotBlank(message = "Project name is required.")
            @Size(max = 120, message = "Project name must be at most 120 characters.")
            String name,
            @Size(max = 2000, message = "Project description must be at most 2000 characters.")
            String description,
            @Valid
            EntryPointRequest entryPoint,
            @Valid
            PlayerConfigRequest playerConfig,
            Long overworldGroupId
    ) {
    }

    public record ProjectResponse(
            Long id,
            Long ownerId,
            String name,
            String description,
            EntryPointData entryPoint,
            PlayerConfigData playerConfig,
            Long overworldGroupId,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record MapGroupRequest(
            @NotBlank(message = "Group name is required.")
            @Size(max = 120, message = "Group name must be at most 120 characters.")
            String name,
            @NotBlank(message = "Group type is required.")
            String type,
            boolean isOverworld,
            @Min(value = 1, message = "minCols must be at least 1.")
            @Max(value = 64, message = "minCols must be at most 64.")
            Integer minCols,
            @Min(value = 1, message = "minRows must be at least 1.")
            @Max(value = 64, message = "minRows must be at most 64.")
            Integer minRows
    ) {
    }

    public record MapGroupResponse(
            Long id,
            Long projectId,
            String name,
            String type,
            boolean isOverworld,
            int minCols,
            int minRows,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record AssignMapToGroupRequest(
            Long mapGroupId,
            Integer gridCol,
            Integer gridRow
    ) {
    }

    public record MapCreateRequest(
            @NotBlank(message = "Map name is required.")
            @Size(max = 120, message = "Map name must be at most 120 characters.")
            String name,
            @Min(value = 4, message = "Map width must be at least 4.")
            @Max(value = 128, message = "Map width must be at most 128.")
            Integer width,
            @Min(value = 4, message = "Map height must be at least 4.")
            @Max(value = 128, message = "Map height must be at most 128.")
            Integer height,
            @Min(value = 1, message = "Tile width must be at least 1.")
            @Max(value = 256, message = "Tile width must be at most 256.")
            Integer tileWidth,
            @Min(value = 1, message = "Tile height must be at least 1.")
            @Max(value = 256, message = "Tile height must be at most 256.")
            Integer tileHeight,
            List<@Valid LayerRequest> layers,
            List<MapObjectRequest> objects,
            Long mapGroupId
    ) {
    }

    public record MapUpdateRequest(
            @NotBlank(message = "Map name is required.")
            @Size(max = 120, message = "Map name must be at most 120 characters.")
            String name,
            @Min(value = 1, message = "Map width must be at least 1.")
            @Max(value = 512, message = "Map width must be at most 512.")
            int width,
            @Min(value = 1, message = "Map height must be at least 1.")
            @Max(value = 512, message = "Map height must be at most 512.")
            int height,
            @Min(value = 1, message = "Tile width must be at least 1.")
            @Max(value = 256, message = "Tile width must be at most 256.")
            int tileWidth,
            @Min(value = 1, message = "Tile height must be at least 1.")
            @Max(value = 256, message = "Tile height must be at most 256.")
            int tileHeight,
            @NotNull(message = "Map layers are required.")
            List<@Valid LayerRequest> layers,
            List<MapObjectRequest> objects,
            @Valid
            SpawnPointRequest spawnPoint
    ) {
    }

    public record LayerRequest(
            Long id,
            @NotBlank(message = "Layer name is required.")
            @Size(max = 120, message = "Layer name must be at most 120 characters.")
            String name,
            @NotNull(message = "Layer type is required.")
            MapLayerType type,
            boolean visible,
            boolean locked,
            int order,
            List<@Valid TileCellRequest> tiles
    ) {
    }

    public record TileCellRequest(
            @Min(value = 0, message = "Tile x must be at least 0.")
            int x,
            @Min(value = 0, message = "Tile y must be at least 0.")
            int y,
            Long tilesetId,
            @Min(value = 0, message = "Tile index must be at least 0.")
            int tileIndex
    ) {
    }

    public record MapObjectRequest(
            UUID id,
            @NotNull(message = "Object type id is required.")
            UUID objectTypeId,
            @Min(value = 0, message = "Object x must be at least 0.")
            int x,
            @Min(value = 0, message = "Object y must be at least 0.")
            int y,
            Map<String, Object> properties
    ) {
    }

    public record MapResponse(
            Long id,
            Long projectId,
            String name,
            int width,
            int height,
            int tileWidth,
            int tileHeight,
            List<MapLayerData> layers,
            List<tessera.tile.backend.editor.model.MapObjectData> objects,
            SpawnPointData spawnPoint,
            Long mapGroupId,
            Integer gridCol,
            Integer gridRow,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record TilesetRequest(
            @NotBlank(message = "Tileset name is required.")
            @Size(max = 120, message = "Tileset name must be at most 120 characters.")
            String name,
            @Size(max = 10_000_000, message = "Tileset imageUrl is too large.")
            String imageUrl,
            AssetType assetType,
            String type,
            @Min(value = 1, message = "Tileset tileWidth must be at least 1.")
            @Max(value = 256, message = "Tileset tileWidth must be at most 256.")
            Integer tileWidth,
            @Min(value = 1, message = "Tileset tileHeight must be at least 1.")
            @Max(value = 256, message = "Tileset tileHeight must be at most 256.")
            Integer tileHeight,
            @Min(value = 1, message = "Tileset columns must be at least 1.")
            @Max(value = 512, message = "Tileset columns must be at most 512.")
            Integer columns,
            @Min(value = 1, message = "Tileset rows must be at least 1.")
            @Max(value = 512, message = "Tileset rows must be at most 512.")
            Integer rows,
            @Min(value = 0, message = "Tileset margin must be at least 0.")
            Integer margin,
            @Min(value = 0, message = "Tileset spacing must be at least 0.")
            Integer spacing,
            Map<String, Object> metadata
    ) {
    }

    public record TilesetResponse(
            Long id,
            Long projectId,
            String name,
            String imageUrl,
            AssetType assetType,
            String type,
            int tileWidth,
            int tileHeight,
            int columns,
            int rows,
            int composedWidth,
            int composedHeight,
            int margin,
            int spacing,
            Long sourceImportId,
            Map<String, Object> metadata,
            Map<String, Object> tileMap,
            List<TilesetTileResponse> tiles,
            List<Map<String, Object>> groups,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record TilesetGroupRequest(
            String name,
            Integer width,
            Integer height,
            String type,
            Integer orderIndex,
            Map<String, Object> metadata
    ) {
    }

    public record MoveTileRequest(
            Long targetTilesetId,
            String targetGroupId,
            Boolean duplicate
    ) {
    }

    public record TileRegionRequest(
            String clientId,
            int sourceX,
            int sourceY,
            int width,
            int height,
            List<String> blockedColors,
            List<String> deletedPixels,
            Boolean animated,
            Integer frameDuration,
            List<TileFrameRequest> frames
    ) {
    }

    public record TileFrameRequest(
            int sourceX,
            int sourceY,
            int width,
            int height,
            List<String> blockedColors,
            List<String> deletedPixels
    ) {
    }

    public record AddedTileResponse(
            String clientId,
            int col,
            int row,
            List<Map<String, Integer>> frameSlots
    ) {
    }

    public record AddTilesResponse(
            Long tilesetId,
            String composedImageUrl,
            List<AddedTileResponse> addedTiles,
            int newComposedHeight,
            int newRows
    ) {
    }

    public record TilesetTileResponse(
            Long id,
            Long extractedTileId,
            int index,
            String imageUrl,
            Map<String, Object> metadata
    ) {
    }

    public record TileGroupResponse(
            Long id,
            String name,
            AssetType type,
            TileGroupCategory category,
            List<TileRefData> tileRefs,
            Map<String, Object> metadata,
            int orderIndex
    ) {
    }

    public record ExtractedTileResponse(
            Long id,
            int index,
            String hash,
            String imageUrl,
            List<SourceOccurrenceData> sourceOccurrences
    ) {
    }

    public record AssetImportResponse(
            Long importId,
            Long projectId,
            String name,
            AssetType assetType,
            AssetImportStatus status,
            int tileWidth,
            int tileHeight,
            String sourceImageUrl,
            Map<String, Object> metadata,
            List<ExtractedTileResponse> tiles,
            List<TileGroupResponse> groups
    ) {
    }

    public record SaveTilesetRequest(
            @NotBlank(message = "Tileset name is required.")
            @Size(max = 120, message = "Tileset name must be at most 120 characters.")
            String tilesetName,
            List<@Valid SaveTileGroupRequest> groups,
            List<@Valid CharacterStateRequest> characterStates
    ) {
    }

    public record SaveTileGroupRequest(
            @NotBlank(message = "Group name is required.")
            @Size(max = 120, message = "Group name must be at most 120 characters.")
            String name,
            @NotNull(message = "Group type is required.")
            AssetType type,
            List<@Valid SaveTileRefRequest> tileRefs,
            Map<String, Object> metadata
    ) {
    }

    public record CharacterStateRequest(
            @NotBlank(message = "Character state name is required.")
            @Size(max = 120, message = "Character state name must be at most 120 characters.")
            String state,
            List<@Valid SaveTileRefRequest> tileRefs,
            Map<String, Object> metadata
    ) {
    }

    public record SaveTileRefRequest(
            @NotNull(message = "Tile id is required.")
            Long tileId,
            int x,
            int y
    ) {
    }

    public record EventRequest(
            @NotBlank(message = "Event name is required.")
            @Size(max = 120, message = "Event name must be at most 120 characters.")
            String name,
            @Min(value = 0, message = "Event x must be at least 0.")
            int x,
            @Min(value = 0, message = "Event y must be at least 0.")
            int y,
            @NotNull(message = "Event type is required.")
            MapEventType type,
            IconTileRequest iconTile,
            Map<String, Object> properties,
            UUID objectTypeId
    ) {
    }

    public record IconTileRequest(
            Long tilesetId,
            @Min(value = 0, message = "Icon tileIndex must be at least 0.")
            int tileIndex
    ) {
    }

    public record EventResponse(
            Long id,
            Long mapId,
            String name,
            int x,
            int y,
            MapEventType type,
            IconTileData iconTile,
            Map<String, Object> properties,
            UUID objectTypeId,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record ObjectTypeRequest(
            @NotBlank(message = "Object type name is required.")
            @Size(max = 120, message = "Object type name must be at most 120 characters.")
            String name,
            @NotBlank(message = "Object type category is required.")
            String category,
            @NotNull(message = "Tileset id is required.")
            Long tilesetId,
            @Min(value = 1) @Max(value = 16)
            Integer spanX,
            @Min(value = 1) @Max(value = 16)
            Integer spanY,
            Map<String, Object> config
    ) {
    }

    public record ObjectTypeResponse(
            UUID id,
            Long projectId,
            Long tilesetId,
            String name,
            String category,
            int spanX,
            int spanY,
            Map<String, Object> config,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

}
