package tessera.tile.backend.editor;

import tessera.tile.backend.assets.AssetStorageProperties;
import tessera.tile.backend.editor.EditorDtos.AssetImportResponse;
import tessera.tile.backend.editor.EditorDtos.CharacterStateRequest;
import tessera.tile.backend.editor.EditorDtos.SaveTileGroupRequest;
import tessera.tile.backend.editor.EditorDtos.SaveTileRefRequest;
import tessera.tile.backend.editor.EditorDtos.SaveTilesetRequest;
import tessera.tile.backend.editor.EditorDtos.TilesetResponse;
import tessera.tile.backend.editor.model.AssetImportEntity;
import tessera.tile.backend.editor.model.AssetImportStatus;
import tessera.tile.backend.editor.model.AssetType;
import tessera.tile.backend.editor.model.ExtractedTileEntity;
import tessera.tile.backend.editor.model.ProjectEntity;
import tessera.tile.backend.editor.model.SourceOccurrenceData;
import tessera.tile.backend.editor.model.TileGroupCategory;
import tessera.tile.backend.editor.model.TileGroupEntity;
import tessera.tile.backend.editor.model.TileRefData;
import tessera.tile.backend.editor.model.TileType;
import tessera.tile.backend.editor.model.TilesetEntity;
import tessera.tile.backend.editor.model.TilesetTileEntity;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AssetImportService {

    private static final int TILE_SIZE = 16;

    private final AssetImportRepository assetImportRepository;
    private final ExtractedTileRepository extractedTileRepository;
    private final TileGroupRepository tileGroupRepository;
    private final TilesetRepository tilesetRepository;
    private final TilesetTileRepository tilesetTileRepository;
    private final EditorAccessService editorAccessService;
    private final AssetStorageProperties assetStorageProperties;

    public AssetImportService(
            AssetImportRepository assetImportRepository,
            ExtractedTileRepository extractedTileRepository,
            TileGroupRepository tileGroupRepository,
            TilesetRepository tilesetRepository,
            TilesetTileRepository tilesetTileRepository,
            EditorAccessService editorAccessService,
            AssetStorageProperties assetStorageProperties
    ) {
        this.assetImportRepository = assetImportRepository;
        this.extractedTileRepository = extractedTileRepository;
        this.tileGroupRepository = tileGroupRepository;
        this.tilesetRepository = tilesetRepository;
        this.tilesetTileRepository = tilesetTileRepository;
        this.editorAccessService = editorAccessService;
        this.assetStorageProperties = assetStorageProperties;
    }

    @Transactional
    public AssetImportResponse createImport(
            Long projectId,
            String username,
            String name,
            AssetType assetType,
            MultipartFile file
    ) {
        ProjectEntity project = editorAccessService.requireOwnedProject(projectId, username);
        validatePng(file);

        byte[] bytes = readFileBytes(file);
        BufferedImage sourceImage = readPng(bytes);

        String folderKey = UUID.randomUUID().toString();
        Path importDirectory = storageBasePath().resolve("imports").resolve(folderKey);
        Path tilesDirectory = importDirectory.resolve("tiles");
        createDirectories(tilesDirectory);

        String sourceRelativePath = "imports/" + folderKey + "/source.png";
        writeFile(importDirectory.resolve("source.png"), bytes);

        AssetImportEntity assetImport = new AssetImportEntity();
        assetImport.setProject(project);
        assetImport.setName(normalizeName(name));
        assetImport.setAssetType(assetType);
        assetImport.setStatus(AssetImportStatus.DRAFT);
        assetImport.setTileWidth(TILE_SIZE);
        assetImport.setTileHeight(TILE_SIZE);
        assetImport.setSourceImagePath(toPublicAssetUrl(sourceRelativePath));
        assetImport.setMetadata(detectImportMetadata(sourceImage));
        assetImport = assetImportRepository.save(assetImport);

        List<ExtractedTileEntity> extractedTiles = extractUniqueTiles(assetImport, sourceImage, folderKey);
        extractedTileRepository.saveAll(extractedTiles);

        return EditorMapper.toAssetImportResponse(assetImport, extractedTiles, List.of());
    }

    @Transactional(readOnly = true)
    public AssetImportResponse getImport(Long importId, String username) {
        AssetImportEntity assetImport = editorAccessService.requireOwnedAssetImport(importId, username);
        return EditorMapper.toAssetImportResponse(
                assetImport,
                extractedTileRepository.findByAssetImportIdOrderByTileIndexAsc(importId),
                tileGroupRepository.findByAssetImportIdOrderByOrderIndexAsc(importId)
        );
    }

    @Transactional
    public TilesetResponse saveImportAsTileset(Long importId, String username, SaveTilesetRequest request) {
        AssetImportEntity assetImport = editorAccessService.requireOwnedAssetImport(importId, username);
        List<ExtractedTileEntity> extractedTiles = extractedTileRepository.findByAssetImportIdOrderByTileIndexAsc(importId);
        if (extractedTiles.isEmpty()) {
            throw new IllegalArgumentException("The import does not contain any extracted tiles.");
        }

        Map<Long, ExtractedTileEntity> extractedTileById = extractedTiles.stream()
                .collect(LinkedHashMap::new, (map, tile) -> map.put(tile.getId(), tile), Map::putAll);

        List<TileGroupEntity> groups = buildGroups(assetImport, request, extractedTileById);
        if (groups.isEmpty()) {
            throw new IllegalArgumentException("At least one group or character state is required.");
        }
        tileGroupRepository.deleteByAssetImportId(importId);
        List<TileGroupEntity> savedGroups = tileGroupRepository.saveAll(groups);

        TilesetEntity tileset = tilesetRepository.findBySourceImportId(importId).orElseGet(TilesetEntity::new);
        tileset.setProject(assetImport.getProject());
        tileset.setName(normalizeName(request.tilesetName()));
        tileset.setImageUrl(assetImport.getSourceImagePath());
        tileset.setAssetType(assetImport.getAssetType());
        tileset.setTileWidth(assetImport.getTileWidth());
        tileset.setTileHeight(assetImport.getTileHeight());
        int selectedTileCount = savedGroups.stream().mapToInt(group -> group.getTileRefs().size()).sum();
        tileset.setColumns(computeTilesetColumns(selectedTileCount));
        tileset.setRows(computeTilesetRows(selectedTileCount, tileset.getColumns()));
        tileset.setMargin(0);
        tileset.setSpacing(0);
        tileset.setSourceImport(assetImport);
        tileset.setMetadata(assetImport.getMetadata() == null ? Map.of() : assetImport.getMetadata());
        tileset = tilesetRepository.save(tileset);
        final TilesetEntity savedTileset = tileset;

        tilesetTileRepository.deleteByTilesetId(savedTileset.getId());
        tilesetTileRepository.flush();
        List<TilesetTileEntity> tilesetTiles = new ArrayList<>();
        int tileIndex = 0;
        for (TileGroupEntity group : savedGroups.stream().sorted(Comparator.comparingInt(TileGroupEntity::getOrderIndex)).toList()) {
            for (TileRefData ref : group.getTileRefs().stream().sorted(Comparator.comparingInt(TileRefData::y).thenComparingInt(TileRefData::x)).toList()) {
                ExtractedTileEntity extractedTile = extractedTileById.get(ref.tileId());
                if (extractedTile == null) {
                    throw new IllegalArgumentException("All tileIds must belong to the selected import.");
                }

                TilesetTileEntity tilesetTile = new TilesetTileEntity();
                tilesetTile.setTileset(savedTileset);
                tilesetTile.setExtractedTile(extractedTile);
                tilesetTile.setTileIndex(tileIndex++);
                tilesetTile.setImagePath(extractedTile.getImagePath());
                tilesetTile.setMetadata(buildTileMetadata(group, ref, extractedTile));
                tilesetTiles.add(tilesetTile);
            }
        }
        tilesetTileRepository.saveAll(tilesetTiles);

        assetImport.setStatus(AssetImportStatus.SAVED);
        assetImportRepository.save(assetImport);

        List<TilesetTileEntity> savedTilesetTiles = tilesetTileRepository.findByTilesetIdOrderByTileIndexAsc(savedTileset.getId());
        return EditorMapper.toTilesetResponse(savedTileset, savedTilesetTiles, savedGroups);
    }

    private List<TileGroupEntity> buildGroups(
            AssetImportEntity assetImport,
            SaveTilesetRequest request,
            Map<Long, ExtractedTileEntity> extractedTileById
    ) {
        List<TileGroupEntity> groups = new ArrayList<>();
        int orderIndex = 0;

        List<SaveTileGroupRequest> requestedGroups = request.groups() == null ? List.of() : request.groups();
        for (SaveTileGroupRequest groupRequest : requestedGroups) {
            groups.add(toTileGroupEntity(
                    assetImport,
                    groupRequest.name(),
                    groupRequest.type(),
                    TileGroupCategory.GROUP,
                    groupRequest.tileRefs(),
                    groupRequest.metadata(),
                    orderIndex++,
                    extractedTileById
            ));
        }

        List<CharacterStateRequest> requestedStates = request.characterStates() == null ? List.of() : request.characterStates();
        for (CharacterStateRequest stateRequest : requestedStates) {
            groups.add(toTileGroupEntity(
                    assetImport,
                    stateRequest.state(),
                    AssetType.CHARACTER,
                    TileGroupCategory.CHARACTER_STATE,
                    stateRequest.tileRefs(),
                    stateRequest.metadata(),
                    orderIndex++,
                    extractedTileById
            ));
        }

        return groups;
    }

    private TileGroupEntity toTileGroupEntity(
            AssetImportEntity assetImport,
            String name,
            AssetType type,
            TileGroupCategory category,
            List<SaveTileRefRequest> tileRefs,
            Map<String, Object> metadata,
            int orderIndex,
            Map<Long, ExtractedTileEntity> extractedTileById
    ) {
        if (tileRefs == null || tileRefs.isEmpty()) {
            throw new IllegalArgumentException("Each group or character state must contain at least one tile.");
        }

        List<TileRefData> normalizedRefs = tileRefs.stream()
                .map(tileRef -> {
                    if (!extractedTileById.containsKey(tileRef.tileId())) {
                        throw new IllegalArgumentException("All tileIds must belong to the selected import.");
                    }
                    return new TileRefData(tileRef.tileId(), tileRef.x(), tileRef.y());
                })
                .toList();

        TileGroupEntity group = new TileGroupEntity();
        group.setAssetImport(assetImport);
        group.setName(normalizeName(name));
        group.setType(type);
        group.setCategory(category);
        group.setTileRefs(normalizedRefs);
        group.setMetadata(metadata == null ? Map.of() : metadata);
        group.setOrderIndex(orderIndex);
        return group;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildTileMetadata(TileGroupEntity group, TileRefData ref, ExtractedTileEntity extractedTile) {
        Map<String, Object> groupMeta = group.getMetadata() == null ? Map.of() : group.getMetadata();

        String groupTileTypeStr = (String) groupMeta.getOrDefault("tileType", TileType.FLOOR.getValue());
        TileType groupTileType = TileType.fromValue(groupTileTypeStr);
        boolean groupSolid = (boolean) groupMeta.getOrDefault("solid", groupTileType.defaultSolid());

        Map<String, Map<String, Object>> tileOverrides =
                (Map<String, Map<String, Object>>) groupMeta.getOrDefault("tileOverrides", Map.of());
        Map<String, Object> override = tileOverrides.getOrDefault(String.valueOf(extractedTile.getId()), Map.of());

        String tileTypeStr = (String) override.getOrDefault("tileType", groupTileType.getValue());
        TileType tileType = TileType.fromValue(tileTypeStr);
        boolean solid = override.containsKey("solid") ? (boolean) override.get("solid") : (override.containsKey("tileType") ? tileType.defaultSolid() : groupSolid);

        Map<String, Object> metadata = new java.util.HashMap<>();
        metadata.put("groupId", group.getId());
        metadata.put("groupName", group.getName());
        metadata.put("groupCategory", group.getCategory().name());
        metadata.put("groupX", ref.x());
        metadata.put("groupY", ref.y());
        metadata.put("tileType", tileType.getValue());
        metadata.put("solid", solid);

        @SuppressWarnings("unchecked")
        Map<String, Object> hitbox = (Map<String, Object>) override.get("hitbox");
        if (hitbox != null) {
            metadata.put("hitbox", hitbox);
        }
        return metadata;
    }

    private List<ExtractedTileEntity> extractUniqueTiles(AssetImportEntity assetImport, BufferedImage sourceImage, String folderKey) {
        int columns = sourceImage.getWidth() / TILE_SIZE;
        int rows = sourceImage.getHeight() / TILE_SIZE;
        if (columns <= 0 || rows <= 0) {
            throw new IllegalArgumentException("PNG must contain at least one complete 16x16 tile.");
        }

        Map<String, TileAccumulator> tilesByHash = new LinkedHashMap<>();

        for (int row = 0; row < rows; row++) {
            for (int column = 0; column < columns; column++) {
                int x = column * TILE_SIZE;
                int y = row * TILE_SIZE;
                BufferedImage tileImage = sourceImage.getSubimage(x, y, TILE_SIZE, TILE_SIZE);
                String hash = computeTileHash(tileImage);
                TileAccumulator accumulator = tilesByHash.get(hash);
                if (accumulator == null) {
                    int tileIndex = tilesByHash.size();
                    String relativePath = "imports/" + folderKey + "/tiles/" + tileIndex + ".png";
                    writePng(storageBasePath().resolve(relativePath), tileImage);
                    accumulator = new TileAccumulator(tileIndex, hash, relativePath);
                    tilesByHash.put(hash, accumulator);
                }
                accumulator.sourceOccurrences().add(new SourceOccurrenceData(x, y));
            }
        }

        return tilesByHash.values().stream()
                .map(accumulator -> {
                    ExtractedTileEntity tile = new ExtractedTileEntity();
                    tile.setAssetImport(assetImport);
                    tile.setTileIndex(accumulator.tileIndex());
                    tile.setHash(accumulator.hash());
                    tile.setImagePath(toPublicAssetUrl(accumulator.relativePath()));
                    tile.setSourceOccurrences(List.copyOf(accumulator.sourceOccurrences()));
                    return tile;
                })
                .toList();
    }

    private Path storageBasePath() {
        return Paths.get(assetStorageProperties.getBasePath()).normalize().toAbsolutePath();
    }

    private void validatePng(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A PNG file is required.");
        }

        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!filename.endsWith(".png") && !contentType.equals("image/png")) {
            throw new IllegalArgumentException("Only PNG files are supported.");
        }
    }

    private byte[] readFileBytes(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to read the uploaded PNG file.", exception);
        }
    }

    private BufferedImage readPng(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            if (image == null) {
                throw new IllegalArgumentException("The uploaded file is not a valid PNG image.");
            }
            return image;
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to parse the uploaded PNG file.", exception);
        }
    }

    private void createDirectories(Path path) {
        try {
            Files.createDirectories(path);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to prepare asset storage directories.", exception);
        }
    }

    private void writeFile(Path path, byte[] bytes) {
        try {
            Files.createDirectories(path.getParent());
            Files.write(path, bytes);
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to store the uploaded source PNG.", exception);
        }
    }

    private void writePng(Path path, BufferedImage image) {
        try {
            Files.createDirectories(path.getParent());
            ImageIO.write(image, "png", path.toFile());
        } catch (IOException exception) {
            throw new UncheckedIOException("Failed to store an extracted tile PNG.", exception);
        }
    }

    private String computeTileHash(BufferedImage tileImage) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            ByteBuffer buffer = ByteBuffer.allocate(TILE_SIZE * TILE_SIZE * Integer.BYTES);
            for (int y = 0; y < TILE_SIZE; y++) {
                for (int x = 0; x < TILE_SIZE; x++) {
                    buffer.putInt(tileImage.getRGB(x, y));
                }
            }
            byte[] hash = digest.digest(buffer.array());
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte value : hash) {
                builder.append(String.format("%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 hashing is not available.", exception);
        }
    }

    private Map<String, Object> detectImportMetadata(BufferedImage image) {
        Map<String, Integer> borderColors = new HashMap<>();
        for (int x = 0; x < image.getWidth(); x++) {
            countColor(borderColors, image.getRGB(x, 0));
            countColor(borderColors, image.getRGB(x, image.getHeight() - 1));
        }
        for (int y = 1; y < image.getHeight() - 1; y++) {
            countColor(borderColors, image.getRGB(0, y));
            countColor(borderColors, image.getRGB(image.getWidth() - 1, y));
        }

        Map.Entry<String, Integer> dominant = borderColors.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .orElse(null);

        if (dominant == null) {
            return Map.of();
        }

        return Map.of(
                "suggestedTransparentColor", dominant.getKey()
        );
    }

    private void countColor(Map<String, Integer> counts, int argb) {
        String hex = String.format("#%08X", argb);
        counts.merge(hex, 1, Integer::sum);
    }

    private int computeTilesetColumns(int tileCount) {
        return Math.max(1, Math.min(8, tileCount));
    }

    private int computeTilesetRows(int tileCount, int columns) {
        return Math.max(1, (int) Math.ceil((double) tileCount / columns));
    }

    private String normalizeName(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException("Asset name is required.");
        }
        return value.trim();
    }

    private String toPublicAssetUrl(String relativePath) {
        return "/assets/" + relativePath.replace('\\', '/');
    }

    record TileAccumulator(
            int tileIndex,
            String hash,
            String relativePath,
            List<SourceOccurrenceData> sourceOccurrences
    ) {
        TileAccumulator(int tileIndex, String hash, String relativePath) {
            this(tileIndex, hash, relativePath, new ArrayList<>());
        }
    }
}
