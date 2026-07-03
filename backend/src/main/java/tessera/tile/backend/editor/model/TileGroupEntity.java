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
import java.util.List;
import java.util.Map;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "tile_group")
public class TileGroupEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_id", nullable = false)
    private AssetImportEntity assetImport;

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private AssetType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TileGroupCategory category;

    @Convert(converter = TileRefListJsonConverter.class)
    @Column(name = "tile_refs", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private List<TileRefData> tileRefs;

    @Convert(converter = PropertiesJsonConverter.class)
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private Map<String, Object> metadata;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    public Long getId() {
        return id;
    }

    public AssetImportEntity getAssetImport() {
        return assetImport;
    }

    public void setAssetImport(AssetImportEntity assetImport) {
        this.assetImport = assetImport;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public AssetType getType() {
        return type;
    }

    public void setType(AssetType type) {
        this.type = type;
    }

    public TileGroupCategory getCategory() {
        return category;
    }

    public void setCategory(TileGroupCategory category) {
        this.category = category;
    }

    public List<TileRefData> getTileRefs() {
        return tileRefs;
    }

    public void setTileRefs(List<TileRefData> tileRefs) {
        this.tileRefs = tileRefs;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public int getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(int orderIndex) {
        this.orderIndex = orderIndex;
    }
}
