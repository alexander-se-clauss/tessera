package tessera.tile.backend.editor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.Map;
import java.util.List;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "tileset")
public class TilesetEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "tile_width", nullable = false)
    private int tileWidth;

    @Column(name = "tile_height", nullable = false)
    private int tileHeight;

    @Column(nullable = false)
    private int columns;

    @Column(nullable = false)
    private int rows;

    @Column(name = "composed_width", nullable = false)
    private int composedWidth = 256;

    @Column(name = "composed_height", nullable = false)
    private int composedHeight = 16;

    @Column(nullable = false)
    private int margin;

    @Column(nullable = false)
    private int spacing;

    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false, length = 32)
    private AssetType assetType = AssetType.ENVIRONMENT;

    @Column(nullable = false, length = 32)
    private String type = "background";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_import_id")
    private AssetImportEntity sourceImport;

    @Convert(converter = PropertiesJsonConverter.class)
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private Map<String, Object> metadata = Map.of();

    @Convert(converter = PropertiesJsonConverter.class)
    @Column(name = "tile_map", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private Map<String, Object> tileMap = Map.of();

    @Convert(converter = PropertiesListJsonConverter.class)
    @Column(name = "editor_groups", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private List<Map<String, Object>> editorGroups = List.of();

    public Long getId() {
        return id;
    }

    public ProjectEntity getProject() {
        return project;
    }

    public void setProject(ProjectEntity project) {
        this.project = project;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public int getTileWidth() {
        return tileWidth;
    }

    public void setTileWidth(int tileWidth) {
        this.tileWidth = tileWidth;
    }

    public int getTileHeight() {
        return tileHeight;
    }

    public void setTileHeight(int tileHeight) {
        this.tileHeight = tileHeight;
    }

    public int getColumns() {
        return columns;
    }

    public void setColumns(int columns) {
        this.columns = columns;
    }

    public int getRows() {
        return rows;
    }

    public void setRows(int rows) {
        this.rows = rows;
    }

    public int getComposedWidth() {
        return composedWidth;
    }

    public void setComposedWidth(int composedWidth) {
        this.composedWidth = composedWidth;
    }

    public int getComposedHeight() {
        return composedHeight;
    }

    public void setComposedHeight(int composedHeight) {
        this.composedHeight = composedHeight;
    }

    public int getMargin() {
        return margin;
    }

    public void setMargin(int margin) {
        this.margin = margin;
    }

    public int getSpacing() {
        return spacing;
    }

    public void setSpacing(int spacing) {
        this.spacing = spacing;
    }

    public AssetType getAssetType() {
        return assetType;
    }

    public void setAssetType(AssetType assetType) {
        this.assetType = assetType;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public AssetImportEntity getSourceImport() {
        return sourceImport;
    }

    public void setSourceImport(AssetImportEntity sourceImport) {
        this.sourceImport = sourceImport;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public Map<String, Object> getTileMap() {
        return tileMap;
    }

    public void setTileMap(Map<String, Object> tileMap) {
        this.tileMap = tileMap;
    }

    public List<Map<String, Object>> getEditorGroups() {
        return editorGroups;
    }

    public void setEditorGroups(List<Map<String, Object>> editorGroups) {
        this.editorGroups = editorGroups;
    }

}
