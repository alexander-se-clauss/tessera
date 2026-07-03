package tessera.tile.backend.editor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import tessera.tile.backend.assets.AssetStorageProperties;
import tessera.tile.backend.editor.EditorDtos.AssetImportResponse;
import tessera.tile.backend.editor.EditorDtos.SaveTileRefRequest;
import tessera.tile.backend.editor.EditorDtos.SaveTilesetRequest;
import tessera.tile.backend.editor.model.AssetImportEntity;
import tessera.tile.backend.editor.model.AssetImportStatus;
import tessera.tile.backend.editor.model.AssetType;
import tessera.tile.backend.editor.model.ExtractedTileEntity;
import tessera.tile.backend.editor.model.ProjectEntity;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;
import org.springframework.mock.web.MockMultipartFile;

class AssetImportServiceTest {

    @TempDir
    Path tempDir;

    @Test
    void rejectsNonPngFiles() {
        AssetImportService service = createService(tempDir);
        MockMultipartFile file = new MockMultipartFile("file", "map.jpg", "image/jpeg", new byte[] {1, 2, 3});

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.createImport(1L, "testuser", "Example", AssetType.ENVIRONMENT, file)
        );

        assertEquals("Only PNG files are supported.", exception.getMessage());
    }

    @Test
    void extractsUniqueTilesAndTracksOccurrences() throws Exception {
        AssetImportService service = createService(tempDir);
        byte[] png = createDuplicateTilePng();
        MockMultipartFile file = new MockMultipartFile("file", "map.png", "image/png", png);

        AssetImportResponse response = service.createImport(1L, "testuser", "Forest", AssetType.ENVIRONMENT, file);

        assertEquals(1, response.tiles().size());
        assertEquals(2, response.tiles().get(0).sourceOccurrences().size());
        assertEquals(16, response.tileWidth());
        assertEquals(16, response.tileHeight());
    }

    @Test
    void saveAsTilesetRejectsForeignTileIds() {
        AssetImportRepository assetImportRepository = mock(AssetImportRepository.class);
        ExtractedTileRepository extractedTileRepository = mock(ExtractedTileRepository.class);
        TileGroupRepository tileGroupRepository = mock(TileGroupRepository.class);
        TilesetRepository tilesetRepository = mock(TilesetRepository.class);
        TilesetTileRepository tilesetTileRepository = mock(TilesetTileRepository.class);
        EditorAccessService accessService = mock(EditorAccessService.class);
        AssetStorageProperties properties = new AssetStorageProperties();
        properties.setBasePath(tempDir.toString());

        AssetImportEntity assetImport = new AssetImportEntity();
        ProjectEntity project = new ProjectEntity();
        project.setName("Demo");
        assetImport.setProject(project);
        assetImport.setName("Imported");
        assetImport.setAssetType(AssetType.ENVIRONMENT);
        assetImport.setStatus(AssetImportStatus.DRAFT);
        assetImport.setTileWidth(16);
        assetImport.setTileHeight(16);
        assetImport.setSourceImagePath("/assets/imports/demo/source.png");
        assetImport.setMetadata(Map.of());

        ExtractedTileEntity tile = new ExtractedTileEntity();
        tile.setAssetImport(assetImport);
        tile.setTileIndex(0);
        tile.setHash("abc");
        tile.setImagePath("/assets/imports/demo/tiles/0.png");
        tile.setSourceOccurrences(List.of());
        setEntityId(tile, 10L);

        when(accessService.requireOwnedAssetImport(1L, "testuser")).thenReturn(assetImport);
        when(extractedTileRepository.findByAssetImportIdOrderByTileIndexAsc(1L)).thenReturn(List.of(tile));

        AssetImportService service = new AssetImportService(
                assetImportRepository,
                extractedTileRepository,
                tileGroupRepository,
                tilesetRepository,
                tilesetTileRepository,
                accessService,
                properties
        );

        SaveTilesetRequest request = new SaveTilesetRequest(
                "Tiles",
                List.of(new EditorDtos.SaveTileGroupRequest(
                        "Ground",
                        AssetType.ENVIRONMENT,
                        List.of(new SaveTileRefRequest(999L, 0, 0)),
                        Map.of()
                )),
                List.of()
        );

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> service.saveImportAsTileset(1L, "testuser", request)
        );

        assertEquals("All tileIds must belong to the selected import.", exception.getMessage());
    }

    private AssetImportService createService(Path assetPath) {
        AssetImportRepository assetImportRepository = mock(AssetImportRepository.class);
        ExtractedTileRepository extractedTileRepository = mock(ExtractedTileRepository.class);
        TileGroupRepository tileGroupRepository = mock(TileGroupRepository.class);
        TilesetRepository tilesetRepository = mock(TilesetRepository.class);
        TilesetTileRepository tilesetTileRepository = mock(TilesetTileRepository.class);
        EditorAccessService accessService = mock(EditorAccessService.class);
        AssetStorageProperties properties = new AssetStorageProperties();
        properties.setBasePath(assetPath.toString());

        ProjectEntity project = new ProjectEntity();
        project.setName("Demo");
        setEntityId(project, 1L);
        when(accessService.requireOwnedProject(1L, "testuser")).thenReturn(project);

        when(assetImportRepository.save(any(AssetImportEntity.class))).thenAnswer(invocation -> {
            AssetImportEntity entity = invocation.getArgument(0);
            setEntityId(entity, 99L);
            return entity;
        });
        when(extractedTileRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        return new AssetImportService(
                assetImportRepository,
                extractedTileRepository,
                tileGroupRepository,
                tilesetRepository,
                tilesetTileRepository,
                accessService,
                properties
        );
    }

    private byte[] createDuplicateTilePng() throws Exception {
        BufferedImage image = new BufferedImage(32, 16, BufferedImage.TYPE_INT_ARGB);
        for (int y = 0; y < 16; y++) {
            for (int x = 0; x < 16; x++) {
                image.setRGB(x, y, 0xFF00AA33);
                image.setRGB(x + 16, y, 0xFF00AA33);
            }
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", outputStream);
        return outputStream.toByteArray();
    }

    private void setEntityId(Object entity, Long id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
