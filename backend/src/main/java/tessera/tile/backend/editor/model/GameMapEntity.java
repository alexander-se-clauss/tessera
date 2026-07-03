package tessera.tile.backend.editor.model;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.List;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "game_map")
public class GameMapEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "project_id", nullable = false)
    private ProjectEntity project;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(name = "tile_width", nullable = false)
    private int tileWidth;

    @Column(name = "tile_height", nullable = false)
    private int tileHeight;

    @Convert(converter = MapLayerListJsonConverter.class)
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private List<MapLayerData> layers;

    @Convert(converter = MapObjectListJsonConverter.class)
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private List<MapObjectData> objects = List.of();

    @Convert(converter = SpawnPointJsonConverter.class)
    @Column(name = "spawn_point", nullable = true, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private SpawnPointData spawnPoint;

    @Column(name = "map_group_id", nullable = true)
    private Long mapGroupId;

    @Column(name = "grid_col", nullable = true)
    private Integer gridCol;

    @Column(name = "grid_row", nullable = true)
    private Integer gridRow;

    public Long getId() { return id; }

    public ProjectEntity getProject() { return project; }
    public void setProject(ProjectEntity project) { this.project = project; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getWidth() { return width; }
    public void setWidth(int width) { this.width = width; }

    public int getHeight() { return height; }
    public void setHeight(int height) { this.height = height; }

    public int getTileWidth() { return tileWidth; }
    public void setTileWidth(int tileWidth) { this.tileWidth = tileWidth; }

    public int getTileHeight() { return tileHeight; }
    public void setTileHeight(int tileHeight) { this.tileHeight = tileHeight; }

    public List<MapLayerData> getLayers() { return layers; }
    public void setLayers(List<MapLayerData> layers) { this.layers = layers; }

    public List<MapObjectData> getObjects() { return objects == null ? List.of() : objects; }
    public void setObjects(List<MapObjectData> objects) { this.objects = objects == null ? List.of() : objects; }

    public SpawnPointData getSpawnPoint() { return spawnPoint; }
    public void setSpawnPoint(SpawnPointData spawnPoint) { this.spawnPoint = spawnPoint; }

    public Long getMapGroupId() { return mapGroupId; }
    public void setMapGroupId(Long mapGroupId) { this.mapGroupId = mapGroupId; }

    public Integer getGridCol() { return gridCol; }
    public void setGridCol(Integer gridCol) { this.gridCol = gridCol; }

    public Integer getGridRow() { return gridRow; }
    public void setGridRow(Integer gridRow) { this.gridRow = gridRow; }
}
