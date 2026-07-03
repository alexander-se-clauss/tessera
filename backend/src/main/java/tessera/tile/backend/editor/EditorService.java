package tessera.tile.backend.editor;

import tessera.tile.backend.auth.UserAccount;
import tessera.tile.backend.editor.EditorDtos.AssignMapToGroupRequest;
import tessera.tile.backend.editor.EditorDtos.AddTilesResponse;
import tessera.tile.backend.editor.EditorDtos.AddedTileResponse;
import tessera.tile.backend.editor.EditorDtos.EventRequest;
import tessera.tile.backend.editor.EditorDtos.EventResponse;
import tessera.tile.backend.editor.EditorDtos.GroupNeighborCell;
import tessera.tile.backend.editor.EditorDtos.GroupNeighborsResponse;
import tessera.tile.backend.editor.EditorDtos.LayerRequest;
import tessera.tile.backend.editor.EditorDtos.MapCreateRequest;
import tessera.tile.backend.editor.EditorDtos.MapGroupRequest;
import tessera.tile.backend.editor.EditorDtos.MapGroupResponse;
import tessera.tile.backend.editor.EditorDtos.MapResponse;
import tessera.tile.backend.editor.EditorDtos.MapUpdateRequest;
import tessera.tile.backend.editor.EditorDtos.MoveTileRequest;
import tessera.tile.backend.editor.EditorDtos.ObjectTypeRequest;
import tessera.tile.backend.editor.EditorDtos.ObjectTypeResponse;
import tessera.tile.backend.editor.EditorDtos.ProjectRequest;
import tessera.tile.backend.editor.EditorDtos.ProjectResponse;
import tessera.tile.backend.editor.EditorDtos.TilesetRequest;
import tessera.tile.backend.editor.EditorDtos.TilesetResponse;
import tessera.tile.backend.editor.EditorDtos.TilesetGroupRequest;
import tessera.tile.backend.editor.EditorDtos.TileRegionRequest;
import tessera.tile.backend.editor.model.AssetType;
import tessera.tile.backend.editor.model.CollisionBoxData;
import tessera.tile.backend.editor.model.EntryPointData;
import tessera.tile.backend.editor.model.GameMapEntity;
import tessera.tile.backend.editor.model.MapEventEntity;
import tessera.tile.backend.editor.model.MapEventType;
import tessera.tile.backend.editor.model.MapGroupEntity;
import tessera.tile.backend.editor.model.MapGroupType;
import tessera.tile.backend.editor.model.MapLayerData;
import tessera.tile.backend.editor.model.MapLayerType;
import tessera.tile.backend.editor.model.MapObjectData;
import tessera.tile.backend.editor.model.MirrorMovementsData;
import tessera.tile.backend.editor.model.ObjectTypeEntity;
import tessera.tile.backend.editor.model.PlayerConfigData;
import tessera.tile.backend.editor.model.ProjectEntity;
import tessera.tile.backend.editor.model.SpawnPointData;
import tessera.tile.backend.editor.model.TileCellData;
import tessera.tile.backend.editor.model.TileGroupEntity;
import tessera.tile.backend.editor.model.TilesetEntity;
import tessera.tile.backend.editor.model.TilesetTileEntity;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import javax.imageio.ImageIO;

@Service
public class EditorService {

    private final ProjectRepository projectRepository;
    private final GameMapRepository gameMapRepository;
    private final MapGroupRepository mapGroupRepository;
    private final TilesetRepository tilesetRepository;
    private final TilesetTileRepository tilesetTileRepository;
    private final TileGroupRepository tileGroupRepository;
    private final MapEventRepository mapEventRepository;
    private final ObjectTypeRepository objectTypeRepository;
    private final EditorAccessService editorAccessService;
    private final TilesetImageStorage tilesetImageStorage;

    public EditorService(
            ProjectRepository projectRepository,
            GameMapRepository gameMapRepository,
            MapGroupRepository mapGroupRepository,
            TilesetRepository tilesetRepository,
            TilesetTileRepository tilesetTileRepository,
            TileGroupRepository tileGroupRepository,
            MapEventRepository mapEventRepository,
            ObjectTypeRepository objectTypeRepository,
            EditorAccessService editorAccessService,
            TilesetImageStorage tilesetImageStorage
    ) {
        this.projectRepository = projectRepository;
        this.gameMapRepository = gameMapRepository;
        this.mapGroupRepository = mapGroupRepository;
        this.tilesetRepository = tilesetRepository;
        this.tilesetTileRepository = tilesetTileRepository;
        this.tileGroupRepository = tileGroupRepository;
        this.mapEventRepository = mapEventRepository;
        this.objectTypeRepository = objectTypeRepository;
        this.editorAccessService = editorAccessService;
        this.tilesetImageStorage = tilesetImageStorage;
    }

    // ── Projects ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ProjectResponse> listProjects(String username) {
        return projectRepository.findByOwnerUsernameOrderByUpdatedAtDesc(username).stream()
                .map(EditorMapper::toProjectResponse)
                .toList();
    }

    @Transactional
    public ProjectResponse createProject(String username, ProjectRequest request) {
        UserAccount owner = editorAccessService.requireUser(username);
        ProjectEntity project = new ProjectEntity();
        project.setOwner(owner);
        project.setName(normalizeName(request.name()));
        project.setDescription(normalizeDescription(request.description()));
        return EditorMapper.toProjectResponse(projectRepository.save(project));
    }

    @Transactional(readOnly = true)
    public ProjectResponse getProject(Long projectId, String username) {
        return EditorMapper.toProjectResponse(editorAccessService.requireOwnedProject(projectId, username));
    }

    @Transactional
    public ProjectResponse updateProject(Long projectId, String username, ProjectRequest request) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        project.setName(normalizeName(request.name()));
        project.setDescription(normalizeDescription(request.description()));
        if (request.entryPoint() != null) {
            Long mapId = request.entryPoint().mapId();
            GameMapEntity map = gameMapRepository.findById(mapId)
                    .filter(m -> m.getProject().getId().equals(projectId))
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Entry point map %d does not belong to this project.".formatted(mapId)));
            int ex = request.entryPoint().x();
            int ey = request.entryPoint().y();
            if (ex < 0 || ex >= map.getWidth() || ey < 0 || ey >= map.getHeight()) {
                throw new IllegalArgumentException(
                        "Entry point (%d, %d) is out of bounds for map '%s' (%dx%d).".formatted(
                                ex, ey, map.getName(), map.getWidth(), map.getHeight()));
            }
            project.setEntryPoint(new EntryPointData(mapId, ex, ey));
        } else {
            project.setEntryPoint(null);
        }
        if (request.playerConfig() != null) {
            EditorDtos.PlayerConfigRequest pc = request.playerConfig();
            tilesetRepository.findById(pc.spriteId())
                    .filter(t -> t.getProject().getId().equals(projectId))
                    .filter(t -> t.getAssetType() == AssetType.CHARACTER)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Sprite %d does not belong to this project or is not a character sprite.".formatted(pc.spriteId())));
            project.setPlayerConfig(new PlayerConfigData(
                    pc.spriteId(),
                    pc.moveSpeed(),
                    new CollisionBoxData(
                            pc.collisionBox().width(),
                            pc.collisionBox().height(),
                            pc.collisionBox().offsetX(),
                            pc.collisionBox().offsetY()),
                    pc.mirrorMovements() == null
                            ? new MirrorMovementsData(false, false)
                            : new MirrorMovementsData(
                                    pc.mirrorMovements().leftToRight(),
                                    pc.mirrorMovements().rightToLeft())
            ));
        } else {
            project.setPlayerConfig(null);
        }
        if (request.overworldGroupId() != null) {
            mapGroupRepository.findById(request.overworldGroupId())
                    .filter(g -> g.getProject().getId().equals(projectId))
                    .filter(MapGroupEntity::isOverworld)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Group must belong to this project and have isOverworld=true."));
            project.setOverworldGroupId(request.overworldGroupId());
        } else {
            project.setOverworldGroupId(null);
        }
        return EditorMapper.toProjectResponse(projectRepository.save(project));
    }

    @Transactional
    public void deleteProject(Long projectId, String username) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        projectRepository.delete(project);
    }

    // ── Maps ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MapResponse> listMaps(Long projectId, String username) {
        editorAccessService.requireOwnedProject(projectId, username);
        return gameMapRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream()
                .map(EditorMapper::toMapResponse)
                .toList();
    }

    @Transactional
    public MapResponse createMap(Long projectId, String username, MapCreateRequest request) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        GameMapEntity map = new GameMapEntity();
        map.setProject(project);
        map.setName(normalizeName(request.name()));
        map.setWidth(request.width() != null ? request.width() : 20);
        map.setHeight(request.height() != null ? request.height() : 16);
        map.setTileWidth(16);
        map.setTileHeight(16);
        map.setLayers(request.layers() == null || request.layers().isEmpty()
                ? createDefaultLayers()
                : validateAndMapLayers(request.layers(), map.getWidth(), map.getHeight(), project.getId(), username));
        map.setObjects(validateAndMapObjects(request.objects(), map.getWidth(), map.getHeight(), project.getId(), username));
        if (request.mapGroupId() != null) {
            mapGroupRepository.findById(request.mapGroupId())
                    .filter(g -> g.getProject().getId().equals(projectId))
                    .orElseThrow(() -> new IllegalArgumentException("Map group not found in this project."));
            map.setMapGroupId(request.mapGroupId());
        }
        return EditorMapper.toMapResponse(gameMapRepository.save(map));
    }

    @Transactional(readOnly = true)
    public MapResponse getMap(Long mapId, String username) {
        return EditorMapper.toMapResponse(editorAccessService.requireOwnedMap(mapId, username));
    }

    @Transactional
    public MapResponse updateMap(Long mapId, String username, MapUpdateRequest request) {
        GameMapEntity map = editorAccessService.requireOwnedMap(mapId, username);
        map.setName(normalizeName(request.name()));
        map.setWidth(request.width());
        map.setHeight(request.height());
        map.setTileWidth(request.tileWidth());
        map.setTileHeight(request.tileHeight());
        map.setLayers(validateAndMapLayers(request.layers(), request.width(), request.height(), map.getProject().getId(), username));
        map.setObjects(validateAndMapObjects(request.objects(), request.width(), request.height(), map.getProject().getId(), username));
        if (request.spawnPoint() != null) {
            int sx = request.spawnPoint().x();
            int sy = request.spawnPoint().y();
            if (sx < 0 || sx >= request.width() || sy < 0 || sy >= request.height()) {
                throw new IllegalArgumentException(
                        "Spawn point (%d, %d) is out of bounds for map size %dx%d.".formatted(sx, sy, request.width(), request.height()));
            }
            map.setSpawnPoint(new SpawnPointData(sx, sy));
        } else {
            map.setSpawnPoint(null);
        }
        return EditorMapper.toMapResponse(gameMapRepository.save(map));
    }

    @Transactional
    public void deleteMap(Long mapId, String username) {
        GameMapEntity map = editorAccessService.requireOwnedMap(mapId, username);
        gameMapRepository.delete(map);
    }

    // ── Map groups ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MapGroupResponse> listMapGroups(Long projectId, String username) {
        editorAccessService.requireOwnedProject(projectId, username);
        return mapGroupRepository.findByProjectIdOrderByCreatedAtAsc(projectId).stream()
                .map(EditorMapper::toMapGroupResponse)
                .toList();
    }

    @Transactional
    public MapGroupResponse createMapGroup(Long projectId, String username, MapGroupRequest request) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        MapGroupType type = MapGroupType.fromValue(request.type());
        if (request.isOverworld() && mapGroupRepository.existsByProjectIdAndIsOverworldTrue(projectId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This project already has a group marked as overworld.");
        }
        MapGroupEntity group = new MapGroupEntity();
        group.setProject(project);
        group.setName(normalizeName(request.name()));
        group.setType(type.getValue());
        group.setOverworld(request.isOverworld());
        group.setMinCols(request.minCols() != null ? request.minCols() : 4);
        group.setMinRows(request.minRows() != null ? request.minRows() : 4);
        MapGroupEntity saved = mapGroupRepository.save(group);
        if (request.isOverworld()) {
            project.setOverworldGroupId(saved.getId());
            projectRepository.save(project);
        }
        return EditorMapper.toMapGroupResponse(saved);
    }

    @Transactional(readOnly = true)
    public MapGroupResponse getMapGroup(Long groupId, String username) {
        return EditorMapper.toMapGroupResponse(editorAccessService.requireOwnedMapGroup(groupId, username));
    }

    @Transactional
    public MapGroupResponse updateMapGroup(Long groupId, String username, MapGroupRequest request) {
        MapGroupEntity group = editorAccessService.requireOwnedMapGroup(groupId, username);
        Long projectId = group.getProject().getId();
        MapGroupType type = MapGroupType.fromValue(request.type());
        if (request.isOverworld() && !group.isOverworld()
                && mapGroupRepository.existsByProjectIdAndIsOverworldTrue(projectId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This project already has a group marked as overworld.");
        }
        group.setName(normalizeName(request.name()));
        group.setType(type.getValue());
        if (request.minCols() != null) group.setMinCols(request.minCols());
        if (request.minRows() != null) group.setMinRows(request.minRows());
        boolean wasOverworld = group.isOverworld();
        group.setOverworld(request.isOverworld());
        MapGroupEntity saved = mapGroupRepository.save(group);
        if (!wasOverworld && request.isOverworld()) {
            ProjectEntity project = group.getProject();
            project.setOverworldGroupId(saved.getId());
            projectRepository.save(project);
        } else if (wasOverworld && !request.isOverworld()) {
            ProjectEntity project = group.getProject();
            if (groupId.equals(project.getOverworldGroupId())) {
                project.setOverworldGroupId(null);
                projectRepository.save(project);
            }
        }
        return EditorMapper.toMapGroupResponse(saved);
    }

    @Transactional
    public void deleteMapGroup(Long groupId, String username) {
        MapGroupEntity group = editorAccessService.requireOwnedMapGroup(groupId, username);
        Long projectId = group.getProject().getId();
        gameMapRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream()
                .filter(m -> groupId.equals(m.getMapGroupId()))
                .forEach(m -> {
                    m.setMapGroupId(null);
                    m.setGridCol(null);
                    m.setGridRow(null);
                    gameMapRepository.save(m);
                });
        if (group.isOverworld()) {
            ProjectEntity project = group.getProject();
            project.setOverworldGroupId(null);
            projectRepository.save(project);
        }
        mapGroupRepository.delete(group);
    }

    @Transactional
    public MapResponse assignMapToGroup(Long mapId, String username, AssignMapToGroupRequest request) {
        GameMapEntity map = editorAccessService.requireOwnedMap(mapId, username);
        Long projectId = map.getProject().getId();
        if (request.mapGroupId() != null) {
            mapGroupRepository.findById(request.mapGroupId())
                    .filter(g -> g.getProject().getId().equals(projectId))
                    .orElseThrow(() -> new IllegalArgumentException("Map group not found in this project."));
            map.setMapGroupId(request.mapGroupId());
            if (request.gridCol() != null && request.gridRow() != null) {
                boolean occupied = gameMapRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream()
                        .filter(m -> !m.getId().equals(mapId))
                        .filter(m -> request.mapGroupId().equals(m.getMapGroupId()))
                        .anyMatch(m -> request.gridCol().equals(m.getGridCol())
                                && request.gridRow().equals(m.getGridRow()));
                if (occupied) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Another map already occupies position (%d, %d) in this group."
                                    .formatted(request.gridCol(), request.gridRow()));
                }
                map.setGridCol(request.gridCol());
                map.setGridRow(request.gridRow());
            } else {
                map.setGridCol(null);
                map.setGridRow(null);
            }
        } else {
            map.setMapGroupId(null);
            map.setGridCol(null);
            map.setGridRow(null);
        }
        return EditorMapper.toMapResponse(gameMapRepository.save(map));
    }

    @Transactional(readOnly = true)
    public GroupNeighborsResponse getGroupNeighbors(Long groupId, String username, int col, int row) {
        MapGroupEntity group = editorAccessService.requireOwnedMapGroup(groupId, username);
        List<GameMapEntity> groupMaps = gameMapRepository
                .findByProjectIdOrderByUpdatedAtDesc(group.getProject().getId()).stream()
                .filter(m -> groupId.equals(m.getMapGroupId()))
                .filter(m -> m.getGridCol() != null && m.getGridRow() != null)
                .toList();
        Map<Long, String> nameById = groupMaps.stream()
                .collect(Collectors.toMap(GameMapEntity::getId, GameMapEntity::getName));
        return new GroupNeighborsResponse(
                resolveNeighbor(groupMaps, col, row - 1, nameById),
                resolveNeighbor(groupMaps, col, row + 1, nameById),
                resolveNeighbor(groupMaps, col + 1, row, nameById),
                resolveNeighbor(groupMaps, col - 1, row, nameById)
        );
    }

    // ── Tilesets ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TilesetResponse> listTilesets(Long projectId, String username) {
        editorAccessService.requireOwnedProject(projectId, username);
        return tilesetRepository.findByProjectIdOrderByUpdatedAtDesc(projectId).stream()
                .map(this::toTilesetResponse)
                .toList();
    }

    @Transactional
    public TilesetResponse createTileset(Long projectId, String username, TilesetRequest request) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        TilesetEntity tileset = new TilesetEntity();
        tileset.setProject(project);
        applyTileset(tileset, request);
        if (request.imageUrl() == null || request.imageUrl().isBlank()) {
            tileset.setAssetType(AssetType.ENVIRONMENT);
            tileset.setComposedWidth(256);
            tileset.setComposedHeight(tileset.getTileHeight());
            tileset.setColumns(256 / tileset.getTileWidth());
            tileset.setRows(1);
            tileset.setMargin(0);
            tileset.setSpacing(0);
            tileset.setTileMap(Map.of());
            tileset.setEditorGroups(List.of(defaultObjectsGroup()));
            tileset.setImageUrl(tilesetImageStorage.createBlankImage(projectId, tileset.getComposedWidth(), tileset.getComposedHeight()));
        }
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional(readOnly = true)
    public TilesetResponse getTileset(Long tilesetId, String username) {
        return toTilesetResponse(editorAccessService.requireOwnedTileset(tilesetId, username));
    }

    @Transactional
    public TilesetResponse updateTileset(Long tilesetId, String username, TilesetRequest request) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        applyTileset(tileset, request);
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public void deleteTileset(Long tilesetId, String username) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        tilesetRepository.delete(tileset);
    }

    @Transactional
    public AddTilesResponse addTiles(Long tilesetId, String username, MultipartFile sourceImage, List<TileRegionRequest> regions) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        if (regions == null || regions.isEmpty()) {
            return new AddTilesResponse(tileset.getId(), tileset.getImageUrl(), List.of(), tileset.getComposedHeight(), tileset.getRows());
        }

        BufferedImage source;
        try {
            source = ImageIO.read(sourceImage.getInputStream());
        } catch (IOException exception) {
            throw new IllegalArgumentException("Could not read source PNG.", exception);
        }
        if (source == null) {
            throw new IllegalArgumentException("Could not read source PNG.");
        }

        int columns = Math.max(1, tileset.getComposedWidth() / tileset.getTileWidth());
        Map<String, Object> tileMap = new LinkedHashMap<>(tileset.getTileMap() == null ? Map.of() : tileset.getTileMap());
        BufferedImage composed = tilesetImageStorage.readOrBlank(tileset.getImageUrl(), tileset.getComposedWidth(), tileset.getComposedHeight());
        List<AddedTileResponse> added = new ArrayList<>();

        for (TileRegionRequest region : regions) {
            List<EditorDtos.TileFrameRequest> frames = Boolean.TRUE.equals(region.animated()) && region.frames() != null && !region.frames().isEmpty()
                    ? region.frames()
                    : List.of(new EditorDtos.TileFrameRequest(region.sourceX(), region.sourceY(), region.width(), region.height(), region.blockedColors(), region.deletedPixels()));
            List<int[]> slots = reserveSlots(tileMap, columns, frames.size());
            int requiredRows = slots.stream().mapToInt(slot -> slot[1] + 1).max().orElse(tileset.getRows());
            int requiredHeight = requiredRows * tileset.getTileHeight();
            if (requiredHeight > composed.getHeight()) {
                composed = tilesetImageStorage.grow(composed, tileset.getComposedWidth(), requiredHeight);
            }

            List<Map<String, Integer>> frameSlots = new ArrayList<>();
            List<Map<String, Integer>> frameSlotMetadata = slots.stream()
                    .map(slot -> Map.of("col", slot[0], "row", slot[1]))
                    .toList();
            for (int i = 0; i < frames.size(); i += 1) {
                EditorDtos.TileFrameRequest frame = frames.get(i);
                int[] slot = slots.get(i);
                copyRegion(source, composed, frame.sourceX(), frame.sourceY(), frame.width(), frame.height(), slot[0] * tileset.getTileWidth(), slot[1] * tileset.getTileHeight(), tileset.getTileWidth(), tileset.getTileHeight(), frame.blockedColors(), frame.deletedPixels());
                Map<String, Object> meta = new LinkedHashMap<>();
                meta.put("sourceRef", "upload/" + region.clientId() + "/" + i);
                meta.put("animated", Boolean.TRUE.equals(region.animated()) && i == 0);
                if (Boolean.TRUE.equals(region.animated()) && i == 0) {
                    meta.put("frameCount", frames.size());
                    meta.put("frameDuration", region.frameDuration() != null && region.frameDuration() > 0 ? region.frameDuration() : 120);
                    meta.put("frameSlots", frameSlotMetadata);
                }
                tileMap.put(slot[0] + "," + slot[1], meta);
                frameSlots.add(Map.of("col", slot[0], "row", slot[1]));
            }
            int[] first = slots.get(0);
            added.add(new AddedTileResponse(region.clientId(), first[0], first[1], frameSlots));
        }

        int newRows = Math.max(1, composed.getHeight() / tileset.getTileHeight());
        tileset.setComposedHeight(composed.getHeight());
        tileset.setRows(newRows);
        tileset.setColumns(columns);
        tileset.setTileMap(tileMap);
        tileset.setImageUrl(tilesetImageStorage.writeImage(tileset.getProject().getId(), "tileset-" + tileset.getId() + "-" + System.nanoTime() + ".png", composed));
        tilesetRepository.save(tileset);
        return new AddTilesResponse(tileset.getId(), tileset.getImageUrl(), added, tileset.getComposedHeight(), tileset.getRows());
    }

    @Transactional
    public TilesetResponse removeTile(Long tilesetId, int col, int row, String username) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        BufferedImage composed = tilesetImageStorage.readOrBlank(tileset.getImageUrl(), tileset.getComposedWidth(), tileset.getComposedHeight());
        clearTilePixels(composed, tileset, col, row);
        Map<String, Object> tileMap = new LinkedHashMap<>(tileset.getTileMap());
        tileMap.remove(col + "," + row);
        tileset.setTileMap(tileMap);
        tileset.setImageUrl(tilesetImageStorage.writeImage(tileset.getProject().getId(), "tileset-" + tileset.getId() + "-" + System.nanoTime() + ".png", composed));
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse restitchTile(Long tilesetId, int col, int row, String username, MultipartFile sourceImage, TileRegionRequest region) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        BufferedImage source;
        try {
            source = ImageIO.read(sourceImage.getInputStream());
        } catch (IOException exception) {
            throw new IllegalArgumentException("Could not read source PNG.", exception);
        }
        if (source == null) {
            throw new IllegalArgumentException("Could not read source PNG.");
        }
        int columns = Math.max(1, tileset.getComposedWidth() / tileset.getTileWidth());
        BufferedImage composed = tilesetImageStorage.readOrBlank(tileset.getImageUrl(), tileset.getComposedWidth(), tileset.getComposedHeight());
        Map<String, Object> tileMap = new LinkedHashMap<>(tileset.getTileMap() == null ? Map.of() : tileset.getTileMap());
        Map<String, Object> existingMeta = tileMap.get(col + "," + row) instanceof Map<?, ?> rawMeta
                ? new LinkedHashMap<>((Map<String, Object>) rawMeta)
                : new LinkedHashMap<>();
        int frameCount = Boolean.TRUE.equals(region.animated()) && region.frames() != null && !region.frames().isEmpty()
                ? region.frames().size()
                : 1;
        for (int[] oldSlot : animationFrameSlots(existingMeta, col, row, columns)) {
            tileMap.remove(oldSlot[0] + "," + oldSlot[1]);
            clearTilePixels(composed, tileset, oldSlot[0], oldSlot[1]);
        }

        List<EditorDtos.TileFrameRequest> frames = frameCount > 1
                ? region.frames()
                : List.of(new EditorDtos.TileFrameRequest(region.sourceX(), region.sourceY(), region.width(), region.height(), region.blockedColors(), region.deletedPixels()));
        List<int[]> slots = new ArrayList<>();
        slots.add(new int[] { col, row });
        if (frameCount > 1) {
            tileMap.put(col + "," + row, Map.of("reserved", true));
            slots.addAll(reserveSlots(tileMap, columns, frameCount - 1));
            tileMap.remove(col + "," + row);
        }
        int requiredRows = slots.stream().mapToInt(slot -> slot[1] + 1).max().orElse(tileset.getRows());
        int requiredHeight = requiredRows * tileset.getTileHeight();
        if (requiredHeight > composed.getHeight()) {
            composed = tilesetImageStorage.grow(composed, tileset.getComposedWidth(), requiredHeight);
        }
        List<Map<String, Integer>> frameSlotMetadata = slots.stream()
                .map(slot -> Map.of("col", slot[0], "row", slot[1]))
                .toList();
        for (int i = 0; i < frames.size(); i += 1) {
            EditorDtos.TileFrameRequest frame = frames.get(i);
            int[] slot = slots.get(i);
            int targetCol = slot[0];
            int targetRow = slot[1];
            copyRegion(
                    source,
                    composed,
                    frame.sourceX(),
                    frame.sourceY(),
                    frame.width(),
                    frame.height(),
                    targetCol * tileset.getTileWidth(),
                    targetRow * tileset.getTileHeight(),
                    tileset.getTileWidth(),
                    tileset.getTileHeight(),
                    frame.blockedColors(),
                    frame.deletedPixels()
            );
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("sourceRef", "restitch/" + region.clientId() + "/" + i);
            meta.put("animated", frameCount > 1 && i == 0);
            if (frameCount > 1 && i == 0) {
                meta.put("frameCount", frameCount);
                meta.put("frameDuration", region.frameDuration() != null && region.frameDuration() > 0 ? region.frameDuration() : 120);
                meta.put("frameSlots", frameSlotMetadata);
            }
            tileMap.put(targetCol + "," + targetRow, meta);
        }
        tileset.setComposedHeight(Math.max(tileset.getComposedHeight(), composed.getHeight()));
        tileset.setRows(Math.max(1, composed.getHeight() / tileset.getTileHeight()));
        tileset.setTileMap(tileMap);
        tileset.setImageUrl(tilesetImageStorage.writeImage(tileset.getProject().getId(), "tileset-" + tileset.getId() + "-" + System.nanoTime() + ".png", composed));
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse updateTilesetGroups(Long tilesetId, String username, List<Map<String, Object>> groups) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        tileset.setEditorGroups(groups == null ? List.of(defaultObjectsGroup()) : ensureObjectsGroup(groups));
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse createTilesetGroup(Long tilesetId, String username, TilesetGroupRequest request) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        List<Map<String, Object>> groups = new ArrayList<>(tileset.getEditorGroups() == null ? List.of() : tileset.getEditorGroups());
        groups.add(groupFromRequest(UUID.randomUUID().toString(), request, groups.size(), List.of()));
        tileset.setEditorGroups(ensureObjectsGroup(groups));
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse updateTilesetGroup(Long tilesetId, String groupId, String username, TilesetGroupRequest request) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        List<Map<String, Object>> groups = new ArrayList<>(tileset.getEditorGroups() == null ? List.of() : tileset.getEditorGroups());
        tileset.setEditorGroups(groups.stream().map(group -> groupId.equals(String.valueOf(group.get("id")))
                ? mergeGroupRequest(group, request)
                : group).toList());
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse deleteTilesetGroup(Long tilesetId, String groupId, String username) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        List<Map<String, Object>> groups = new ArrayList<>(tileset.getEditorGroups() == null ? List.of() : tileset.getEditorGroups());
        tileset.setEditorGroups(groups.stream()
                .filter(group -> !groupId.equals(String.valueOf(group.get("id"))) || Boolean.TRUE.equals(group.get("system")))
                .toList());
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse assignTileToTilesetGroup(Long tilesetId, String groupId, String username, MultipartFile sourceImage, TileRegionRequest region) {
        AddTilesResponse response = addTiles(tilesetId, username, sourceImage, List.of(region));
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        AddedTileResponse added = response.addedTiles().isEmpty() ? null : response.addedTiles().get(0);
        if (added == null) return toTilesetResponse(tileset);
        String slot = added.col() + "," + added.row();
        List<Map<String, Object>> groups = new ArrayList<>(tileset.getEditorGroups() == null ? List.of() : tileset.getEditorGroups());
        tileset.setEditorGroups(groups.stream().map(group -> groupId.equals(String.valueOf(group.get("id")))
                ? addSlotToGroup(group, slot)
                : group).toList());
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse removeTileFromTilesetGroup(Long tilesetId, String groupId, int col, int row, String username) {
        TilesetResponse response = removeTile(tilesetId, col, row, username);
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        String slot = col + "," + row;
        List<Map<String, Object>> groups = new ArrayList<>(tileset.getEditorGroups() == null ? List.of() : tileset.getEditorGroups());
        tileset.setEditorGroups(groups.stream().map(group -> groupId.equals(String.valueOf(group.get("id")))
                ? removeSlotFromGroup(group, slot)
                : group).toList());
        return toTilesetResponse(tilesetRepository.save(tileset));
    }

    @Transactional
    public TilesetResponse moveTileToTilesetGroup(Long sourceTilesetId, String sourceGroupId, int sourceCol, int sourceRow, String username, MoveTileRequest request) {
        if (request == null || request.targetTilesetId() == null || request.targetGroupId() == null || request.targetGroupId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target tileset and group are required.");
        }
        TilesetEntity sourceTileset = editorAccessService.requireOwnedTileset(sourceTilesetId, username);
        TilesetEntity targetTileset = editorAccessService.requireOwnedTileset(request.targetTilesetId(), username);
        if (!sourceTileset.getProject().getId().equals(targetTileset.getProject().getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target tileset must belong to the same project.");
        }

        String sourceSlot = sourceCol + "," + sourceRow;
        Map<String, Object> sourceTileMap = new LinkedHashMap<>(sourceTileset.getTileMap() == null ? Map.of() : sourceTileset.getTileMap());
        Map<String, Object> sourceMeta = sourceTileMap.get(sourceSlot) instanceof Map<?, ?> rawMeta
                ? new LinkedHashMap<>((Map<String, Object>) rawMeta)
                : new LinkedHashMap<>();
        if (!sourceTileMap.containsKey(sourceSlot)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Source tile does not exist.");
        }

        BufferedImage sourceImage = tilesetImageStorage.readOrBlank(sourceTileset.getImageUrl(), sourceTileset.getComposedWidth(), sourceTileset.getComposedHeight());
        BufferedImage targetImage = tilesetImageStorage.readOrBlank(targetTileset.getImageUrl(), targetTileset.getComposedWidth(), targetTileset.getComposedHeight());
        Map<String, Object> targetTileMap = new LinkedHashMap<>(targetTileset.getTileMap() == null ? Map.of() : targetTileset.getTileMap());
        int targetColumns = Math.max(1, targetTileset.getComposedWidth() / targetTileset.getTileWidth());
        int[] targetSlot = reserveSlots(targetTileMap, targetColumns, 1).get(0);
        int requiredHeight = (targetSlot[1] + 1) * targetTileset.getTileHeight();
        if (requiredHeight > targetImage.getHeight()) {
            targetImage = tilesetImageStorage.grow(targetImage, targetTileset.getComposedWidth(), requiredHeight);
        }

        copyRegion(
                sourceImage,
                targetImage,
                sourceCol * sourceTileset.getTileWidth(),
                sourceRow * sourceTileset.getTileHeight(),
                sourceTileset.getTileWidth(),
                sourceTileset.getTileHeight(),
                targetSlot[0] * targetTileset.getTileWidth(),
                targetSlot[1] * targetTileset.getTileHeight(),
                targetTileset.getTileWidth(),
                targetTileset.getTileHeight(),
                List.of(),
                List.of()
        );

        String targetSlotKey = targetSlot[0] + "," + targetSlot[1];
        sourceMeta.put("sourceRef", "moved/" + sourceTilesetId + "/" + sourceSlot);
        targetTileMap.put(targetSlotKey, sourceMeta);
        targetTileset.setTileMap(targetTileMap);
        targetTileset.setComposedHeight(Math.max(targetTileset.getComposedHeight(), targetImage.getHeight()));
        targetTileset.setRows(Math.max(1, targetImage.getHeight() / targetTileset.getTileHeight()));
        targetTileset.setImageUrl(tilesetImageStorage.writeImage(targetTileset.getProject().getId(), "tileset-" + targetTileset.getId() + ".png", targetImage));
        List<Map<String, Object>> targetGroups = new ArrayList<>(targetTileset.getEditorGroups() == null ? List.of() : targetTileset.getEditorGroups());
        targetTileset.setEditorGroups(ensureObjectsGroup(targetGroups.stream().map(group -> request.targetGroupId().equals(String.valueOf(group.get("id")))
                ? addSlotToGroup(group, targetSlotKey)
                : group).toList()));

        if (!Boolean.TRUE.equals(request.duplicate())) {
            clearTilePixels(sourceImage, sourceTileset, sourceCol, sourceRow);
            sourceTileMap.remove(sourceSlot);
            sourceTileset.setTileMap(sourceTileMap);
            sourceTileset.setImageUrl(tilesetImageStorage.writeImage(sourceTileset.getProject().getId(), "tileset-" + sourceTileset.getId() + ".png", sourceImage));
            List<Map<String, Object>> sourceGroups = new ArrayList<>(sourceTileset.getEditorGroups() == null ? List.of() : sourceTileset.getEditorGroups());
            sourceTileset.setEditorGroups(sourceGroups.stream().map(group -> sourceGroupId.equals(String.valueOf(group.get("id")))
                    ? removeSlotFromGroup(group, sourceSlot)
                    : group).toList());
            tilesetRepository.save(sourceTileset);
        }

        return toTilesetResponse(tilesetRepository.save(targetTileset));
    }

    // ── Events ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<EventResponse> listEvents(Long mapId, String username) {
        editorAccessService.requireOwnedMap(mapId, username);
        return mapEventRepository.findByMapIdOrderByUpdatedAtDesc(mapId).stream()
                .map(EditorMapper::toEventResponse)
                .toList();
    }

    @Transactional
    public EventResponse createEvent(Long mapId, String username, EventRequest request) {
        GameMapEntity map = editorAccessService.requireOwnedMap(mapId, username);
        validateCoordinates(request.x(), request.y(), map.getWidth(), map.getHeight(), "Event");
        MapEventEntity event = new MapEventEntity();
        event.setMap(map);
        applyEvent(event, request, username);
        return EditorMapper.toEventResponse(mapEventRepository.save(event));
    }

    @Transactional
    public EventResponse updateEvent(Long eventId, String username, EventRequest request) {
        MapEventEntity event = editorAccessService.requireOwnedEvent(eventId, username);
        validateCoordinates(request.x(), request.y(), event.getMap().getWidth(), event.getMap().getHeight(), "Event");
        applyEvent(event, request, username);
        return EditorMapper.toEventResponse(mapEventRepository.save(event));
    }

    @Transactional
    public void deleteEvent(Long eventId, String username) {
        MapEventEntity event = editorAccessService.requireOwnedEvent(eventId, username);
        mapEventRepository.delete(event);
    }

    // ── Object types ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ObjectTypeResponse> listObjectTypes(Long projectId, Long tilesetId, String username) {
        editorAccessService.requireOwnedProject(projectId, username);
        List<ObjectTypeEntity> all = objectTypeRepository.findByProjectIdOrderByCreatedAtAsc(projectId);
        if (tilesetId != null) {
            all = all.stream().filter(ot -> tilesetId.equals(ot.getTilesetId())).toList();
        }
        return all.stream().map(EditorMapper::toObjectTypeResponse).toList();
    }

    @Transactional
    public ObjectTypeResponse createObjectType(Long projectId, String username, ObjectTypeRequest request) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(request.tilesetId(), username);
        if (!tileset.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Tileset does not belong to this project.");
        }
        ObjectTypeEntity objectType = new ObjectTypeEntity();
        objectType.setProject(project);
        applyObjectType(objectType, request);
        return EditorMapper.toObjectTypeResponse(objectTypeRepository.save(objectType));
    }

    @Transactional(readOnly = true)
    public ObjectTypeResponse getObjectType(UUID id, String username) {
        return EditorMapper.toObjectTypeResponse(editorAccessService.requireOwnedObjectType(id, username));
    }

    @Transactional
    public ObjectTypeResponse updateObjectType(UUID id, String username, ObjectTypeRequest request) {
        ObjectTypeEntity objectType = editorAccessService.requireOwnedObjectType(id, username);
        Long projectId = objectType.getProject().getId();
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(request.tilesetId(), username);
        if (!tileset.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Tileset does not belong to this project.");
        }
        applyObjectType(objectType, request);
        return EditorMapper.toObjectTypeResponse(objectTypeRepository.save(objectType));
    }

    @Transactional
    public void deleteObjectType(UUID id, String username) {
        ObjectTypeEntity objectType = editorAccessService.requireOwnedObjectType(id, username);
        objectTypeRepository.delete(objectType);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private GroupNeighborCell resolveNeighbor(List<GameMapEntity> maps, int col, int row, Map<Long, String> names) {
        return maps.stream()
                .filter(m -> col == m.getGridCol() && row == m.getGridRow())
                .findFirst()
                .map(m -> new GroupNeighborCell(m.getId(), names.getOrDefault(m.getId(), "Unknown"), col, row))
                .orElse(null);
    }

    private void applyObjectType(ObjectTypeEntity objectType, ObjectTypeRequest request) {
        objectType.setName(normalizeName(request.name()));
        objectType.setCategory(request.category().trim());
        objectType.setTilesetId(request.tilesetId());
        objectType.setSpanX(request.spanX() != null ? request.spanX() : 1);
        objectType.setSpanY(request.spanY() != null ? request.spanY() : 1);
        objectType.setConfig(sanitizeObjectTypeConfig(
                request.config(),
                objectType.getSpanX(),
                objectType.getSpanY()
        ));
    }

    private Map<String, Object> sanitizeObjectTypeConfig(Map<String, Object> rawConfig, int spanX, int spanY) {
        Map<String, Object> source = rawConfig == null ? Map.of() : rawConfig;
        Map<String, Object> sanitized = new LinkedHashMap<>();
        Object visualValue = source.get("visual");
        Map<String, Object> visual = visualValue instanceof Map<?, ?> rawVisual
                ? new LinkedHashMap<>((Map<String, Object>) rawVisual)
                : new LinkedHashMap<>();
        visual.putIfAbsent("tileIndex", 0);
        visual.put("spanX", spanX);
        visual.put("spanY", spanY);
        sanitized.put("visual", visual);
        copyIfPresent(source, sanitized, "objectKind");
        copyIfPresent(source, sanitized, "animation");
        copyIfPresent(source, sanitized, "states");
        copyIfPresent(source, sanitized, "defaultState");
        copyIfPresent(source, sanitized, "isStateful");
        copyIfPresent(source, sanitized, "stateDefs");
        copyIfPresent(source, sanitized, "stateTransitions");
        sanitized.put("defaultSolid", source.containsKey("defaultSolid") ? Boolean.TRUE.equals(source.get("defaultSolid")) : true);
        return sanitized;
    }

    private void copyIfPresent(Map<String, Object> source, Map<String, Object> target, String key) {
        if (source.containsKey(key)) {
            target.put(key, source.get(key));
        }
    }

    private void applyTileset(TilesetEntity tileset, TilesetRequest request) {
        tileset.setName(normalizeName(request.name()));
        if (request.imageUrl() != null && !request.imageUrl().isBlank()) {
            tileset.setImageUrl(request.imageUrl().trim());
        }
        tileset.setAssetType(request.assetType() == null ? AssetType.ENVIRONMENT : request.assetType());
        tileset.setType(normalizeTilesetType(request.type()));
        tileset.setTileWidth(request.tileWidth() == null ? 16 : request.tileWidth());
        tileset.setTileHeight(request.tileHeight() == null ? 16 : request.tileHeight());
        tileset.setColumns(request.columns() == null ? Math.max(1, 256 / tileset.getTileWidth()) : request.columns());
        tileset.setRows(request.rows() == null ? 1 : request.rows());
        tileset.setComposedWidth(256);
        tileset.setComposedHeight(Math.max(1, tileset.getRows()) * tileset.getTileHeight());
        tileset.setMargin(request.margin() == null ? 0 : request.margin());
        tileset.setSpacing(request.spacing() == null ? 0 : request.spacing());
        tileset.setMetadata(request.metadata() == null ? Map.of() : request.metadata());
    }

    private String normalizeTilesetType(String type) {
        if ("object".equalsIgnoreCase(type)) return "object";
        return "background";
    }

    private List<int[]> reserveSlots(Map<String, Object> tileMap, int columns, int count) {
        List<int[]> slots = new ArrayList<>();
        int index = 0;
        while (slots.size() < count) {
            int col = index % columns;
            int row = index / columns;
            String key = col + "," + row;
            if (!tileMap.containsKey(key) && slots.stream().noneMatch(slot -> slot[0] == col && slot[1] == row)) {
                slots.add(new int[] { col, row });
            }
            index += 1;
        }
        return slots;
    }

    private List<int[]> animationFrameSlots(Map<String, Object> metadata, int baseCol, int baseRow, int columns) {
        Object rawFrameSlots = metadata.get("frameSlots");
        if (rawFrameSlots instanceof List<?> rawSlots && !rawSlots.isEmpty()) {
            List<int[]> slots = new ArrayList<>();
            for (Object rawSlot : rawSlots) {
                if (!(rawSlot instanceof Map<?, ?> slotMap)) continue;
                Object rawCol = slotMap.get("col");
                Object rawRow = slotMap.get("row");
                if (rawCol instanceof Number colNumber && rawRow instanceof Number rowNumber) {
                    slots.add(new int[] { colNumber.intValue(), rowNumber.intValue() });
                }
            }
            if (!slots.isEmpty()) return slots;
        }

        int frameCount = metadata.get("frameCount") instanceof Number number ? Math.max(1, number.intValue()) : 1;
        List<int[]> slots = new ArrayList<>();
        for (int frame = 0; frame < frameCount && baseCol + frame < columns; frame += 1) {
            slots.add(new int[] { baseCol + frame, baseRow });
        }
        return slots;
    }

    private void copyRegion(BufferedImage source, BufferedImage target, int sourceX, int sourceY, int sourceW, int sourceH, int targetX, int targetY, int targetW, int targetH, List<String> blockedColors, List<String> deletedPixels) {
        java.util.Set<String> blocked = normalizeBlockedColors(blockedColors);
        java.util.Set<String> deleted = deletedPixels == null ? java.util.Set.of() : new java.util.HashSet<>(deletedPixels);
        for (int y = 0; y < targetH; y += 1) {
            for (int x = 0; x < targetW; x += 1) {
                target.setRGB(targetX + x, targetY + y, 0);
            }
        }
        for (int y = 0; y < targetH; y += 1) {
            for (int x = 0; x < targetW; x += 1) {
                int sx = sourceX + Math.min(sourceW - 1, (x * sourceW) / targetW);
                int sy = sourceY + Math.min(sourceH - 1, (y * sourceH) / targetH);
                if (sx >= 0 && sx < source.getWidth() && sy >= 0 && sy < source.getHeight()) {
                    int rgba = source.getRGB(sx, sy);
                    String pixelKey = x + "," + y;
                    if (deleted.contains(pixelKey) || blocked.contains(rgbHex(rgba))) {
                        target.setRGB(targetX + x, targetY + y, 0);
                    } else {
                        target.setRGB(targetX + x, targetY + y, rgba);
                    }
                }
            }
        }
    }

    private java.util.Set<String> normalizeBlockedColors(List<String> colors) {
        if (colors == null || colors.isEmpty()) {
            return java.util.Set.of();
        }
        java.util.Set<String> normalized = new java.util.HashSet<>();
        for (String color : colors) {
            if (color == null) continue;
            String value = color.trim().toLowerCase();
            if (!value.startsWith("#")) {
                value = "#" + value;
            }
            if (value.matches("#[0-9a-f]{6}")) {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private String rgbHex(int rgba) {
        return String.format("#%02x%02x%02x", (rgba >> 16) & 0xff, (rgba >> 8) & 0xff, rgba & 0xff);
    }

    private Map<String, Object> defaultObjectsGroup() {
        return Map.of("id", "objects", "name", "Objects", "type", "object", "system", true, "tiles", List.of());
    }

    private void clearTilePixels(BufferedImage image, TilesetEntity tileset, int col, int row) {
        int startX = col * tileset.getTileWidth();
        int startY = row * tileset.getTileHeight();
        for (int y = startY; y < startY + tileset.getTileHeight() && y < image.getHeight(); y += 1) {
            for (int x = startX; x < startX + tileset.getTileWidth() && x < image.getWidth(); x += 1) {
                image.setRGB(x, y, 0);
            }
        }
    }

    private Map<String, Object> groupFromRequest(String id, TilesetGroupRequest request, int orderIndex, List<String> tiles) {
        Map<String, Object> metadata = new LinkedHashMap<>(request.metadata() == null ? Map.of() : request.metadata());
        metadata.put("width", request.width() == null ? 1 : Math.max(1, request.width()));
        metadata.put("height", request.height() == null ? 1 : Math.max(1, request.height()));
        metadata.put("tileType", request.type() == null || request.type().isBlank() ? "floor" : request.type());
        Map<String, Object> group = new LinkedHashMap<>();
        group.put("id", id);
        group.put("name", request.name() == null || request.name().isBlank() ? "Group" : request.name().trim());
        group.put("type", request.type() == null || request.type().isBlank() ? "floor" : request.type());
        group.put("orderIndex", request.orderIndex() == null ? orderIndex : request.orderIndex());
        group.put("metadata", metadata);
        group.put("tiles", tiles);
        return group;
    }

    private Map<String, Object> mergeGroupRequest(Map<String, Object> group, TilesetGroupRequest request) {
        Map<String, Object> next = new LinkedHashMap<>(group);
        if (request.name() != null && !request.name().isBlank()) next.put("name", request.name().trim());
        if (request.type() != null && !request.type().isBlank()) next.put("type", request.type());
        if (request.orderIndex() != null) next.put("orderIndex", request.orderIndex());
        Map<String, Object> metadata = new LinkedHashMap<>((Map<String, Object>) next.getOrDefault("metadata", Map.of()));
        if (request.metadata() != null) metadata.putAll(request.metadata());
        if (request.width() != null) metadata.put("width", Math.max(1, request.width()));
        if (request.height() != null) metadata.put("height", Math.max(1, request.height()));
        if (request.type() != null && !request.type().isBlank()) metadata.put("tileType", request.type());
        next.put("metadata", metadata);
        return next;
    }

    private Map<String, Object> addSlotToGroup(Map<String, Object> group, String slot) {
        Map<String, Object> next = new LinkedHashMap<>(group);
        List<String> tiles = new ArrayList<>(((List<?>) next.getOrDefault("tiles", List.of())).stream().map(String::valueOf).toList());
        if (!tiles.contains(slot)) tiles.add(slot);
        next.put("tiles", tiles);
        return next;
    }

    private Map<String, Object> removeSlotFromGroup(Map<String, Object> group, String slot) {
        Map<String, Object> next = new LinkedHashMap<>(group);
        List<String> tiles = ((List<?>) next.getOrDefault("tiles", List.of())).stream().map(String::valueOf).filter(value -> !value.equals(slot)).toList();
        next.put("tiles", tiles);
        return next;
    }

    private List<Map<String, Object>> ensureObjectsGroup(List<Map<String, Object>> groups) {
        boolean hasObjects = groups.stream().anyMatch(group -> Boolean.TRUE.equals(group.get("system")) || "objects".equals(group.get("id")));
        return hasObjects ? groups : java.util.stream.Stream.concat(groups.stream(), java.util.stream.Stream.of(defaultObjectsGroup())).toList();
    }

    private TilesetResponse toTilesetResponse(TilesetEntity tileset) {
        List<TilesetTileEntity> tiles = tilesetTileRepository.findByTilesetIdOrderByTileIndexAsc(tileset.getId());
        List<TileGroupEntity> groups = tileset.getSourceImport() == null
                ? List.of()
                : tileGroupRepository.findByAssetImportIdOrderByOrderIndexAsc(tileset.getSourceImport().getId());
        return EditorMapper.toTilesetResponse(tileset, tiles, groups);
    }

    private void applyEvent(MapEventEntity event, EventRequest request, String username) {
        event.setName(normalizeName(request.name()));
        event.setX(request.x());
        event.setY(request.y());
        event.setType(request.type() == null ? MapEventType.TRIGGER : request.type());
        event.setIconTile(EditorMapper.toIconTileData(request.iconTile()));
        event.setProperties(request.properties() == null ? Map.of() : request.properties());
        event.setObjectTypeId(null);
        validateIconTile(event, username);
    }

    private void validateIconTile(MapEventEntity event, String username) {
        if (event.getIconTile() == null || event.getIconTile().tilesetId() == null) return;
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(event.getIconTile().tilesetId(), username);
        if (!tileset.getProject().getId().equals(event.getMap().getProject().getId())) {
            throw new IllegalArgumentException("Event icon tileset must belong to the same project.");
        }
    }

    private List<MapLayerData> validateAndMapLayers(
            List<LayerRequest> layers, int width, int height, Long projectId, String username) {
        if (layers.isEmpty()) throw new IllegalArgumentException("Map layers are required.");
        Map<MapLayerType, MapLayerData> uniqueTypes = new LinkedHashMap<>();
        AtomicLong generatedIds = new AtomicLong(1000L);
        for (LayerRequest layerRequest : layers) {
            MapLayerData layer = EditorMapper.toLayerData(layerRequest);
            if (uniqueTypes.containsKey(layer.type())) {
                throw new IllegalArgumentException("Map layers must have unique layer types.");
            }
            List<TileCellData> tiles = layer.tiles() == null ? List.of() : layer.tiles();
            for (TileCellData tile : tiles) {
                validateCoordinates(tile.x(), tile.y(), width, height, "Tile");
                if (layer.type() == MapLayerType.COLLISION) {
                    if (tile.tilesetId() != null) validateLayerTileset(tile.tilesetId(), projectId, username);
                } else if (tile.tilesetId() == null) {
                    throw new IllegalArgumentException("Painted tile cells require a tilesetId.");
                } else {
                    validateLayerTileset(tile.tilesetId(), projectId, username);
                }
            }
            MapLayerData normalized = new MapLayerData(
                    layer.id() == null ? generatedIds.incrementAndGet() : layer.id(),
                    layer.name(), layer.type(), layer.visible(), layer.locked(), layer.order(), tiles);
            uniqueTypes.put(normalized.type(), normalized);
        }
        if (!uniqueTypes.containsKey(MapLayerType.OBJECT)) {
            uniqueTypes.put(MapLayerType.OBJECT, new MapLayerData(generatedIds.incrementAndGet(), "Objects", MapLayerType.OBJECT, true, false, 1, List.of()));
        }
        for (MapLayerType type : List.of(
                MapLayerType.BACKGROUND, MapLayerType.FOREGROUND, MapLayerType.COLLISION, MapLayerType.EVENT)) {
            if (!uniqueTypes.containsKey(type)) {
                throw new IllegalArgumentException("Map layers must include " + type.getValue() + ".");
            }
        }
        return uniqueTypes.values().stream()
                .sorted((l, r) -> Integer.compare(l.order(), r.order()))
                .toList();
    }

    private List<MapLayerData> createDefaultLayers() {
        return List.of(
                new MapLayerData(1L, "Background", MapLayerType.BACKGROUND, true, false, 0, List.of()),
                new MapLayerData(2L, "Objects", MapLayerType.OBJECT, true, false, 1, List.of()),
                new MapLayerData(3L, "Foreground", MapLayerType.FOREGROUND, true, false, 2, List.of()),
                new MapLayerData(4L, "Collision", MapLayerType.COLLISION, true, false, 3, List.of()),
                new MapLayerData(5L, "Events", MapLayerType.EVENT, true, false, 4, List.of())
        );
    }

    private List<MapObjectData> validateAndMapObjects(List<EditorDtos.MapObjectRequest> objects, int width, int height, Long projectId, String username) {
        if (objects == null) return List.of();
        return objects.stream().map(object -> {
            validateCoordinates(object.x(), object.y(), width, height, "Object");
            ObjectTypeEntity objectType = editorAccessService.requireOwnedObjectType(object.objectTypeId(), username);
            if (!objectType.getProject().getId().equals(projectId)) {
                throw new IllegalArgumentException("Object type must belong to this project.");
            }
            return new MapObjectData(
                    object.id() == null ? UUID.randomUUID() : object.id(),
                    object.objectTypeId(),
                    object.x(),
                    object.y(),
                    object.properties() == null ? Map.of() : object.properties()
            );
        }).toList();
    }

    private void validateCoordinates(int x, int y, int width, int height, String label) {
        if (x < 0 || x >= width || y < 0 || y >= height) {
            throw new IllegalArgumentException(label + " coordinates are outside the map bounds.");
        }
    }

    private String normalizeName(String value) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.isBlank()) throw new IllegalArgumentException("Name is required.");
        return normalized;
    }

    private String normalizeDescription(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private void validateLayerTileset(Long tilesetId, Long projectId, String username) {
        TilesetEntity tileset = editorAccessService.requireOwnedTileset(tilesetId, username);
        if (!tileset.getProject().getId().equals(projectId)) {
            throw new IllegalArgumentException("Layer tiles must use tilesets from the same project.");
        }
    }
}
