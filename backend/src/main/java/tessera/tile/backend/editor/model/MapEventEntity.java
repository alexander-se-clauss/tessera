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
import java.util.UUID;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "map_event")
public class MapEventEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "map_id", nullable = false)
    private GameMapEntity map;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false)
    private int x;

    @Column(nullable = false)
    private int y;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private MapEventType type;

    @Convert(converter = IconTileJsonConverter.class)
    @Column(name = "icon_tile", columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private IconTileData iconTile;

    @Convert(converter = PropertiesJsonConverter.class)
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private Map<String, Object> properties;

    @Column(name = "object_type_id")
    private UUID objectTypeId;

    public Long getId() {
        return id;
    }

    public GameMapEntity getMap() {
        return map;
    }

    public void setMap(GameMapEntity map) {
        this.map = map;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getX() {
        return x;
    }

    public void setX(int x) {
        this.x = x;
    }

    public int getY() {
        return y;
    }

    public void setY(int y) {
        this.y = y;
    }

    public MapEventType getType() {
        return type;
    }

    public void setType(MapEventType type) {
        this.type = type;
    }

    public IconTileData getIconTile() {
        return iconTile;
    }

    public void setIconTile(IconTileData iconTile) {
        this.iconTile = iconTile;
    }

    public Map<String, Object> getProperties() {
        return properties;
    }

    public void setProperties(Map<String, Object> properties) {
        this.properties = properties;
    }

    public UUID getObjectTypeId() {
        return objectTypeId;
    }

    public void setObjectTypeId(UUID objectTypeId) {
        this.objectTypeId = objectTypeId;
    }
}
