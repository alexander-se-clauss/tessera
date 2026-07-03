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
import java.util.Map;
import org.hibernate.annotations.ColumnTransformer;

@Entity
@Table(name = "tileset_tile")
public class TilesetTileEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tileset_id", nullable = false)
    private TilesetEntity tileset;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "extracted_tile_id", nullable = false)
    private ExtractedTileEntity extractedTile;

    @Column(name = "tile_index", nullable = false)
    private int tileIndex;

    @Column(name = "image_path", nullable = false, columnDefinition = "TEXT")
    private String imagePath;

    @Convert(converter = PropertiesJsonConverter.class)
    @Column(nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private Map<String, Object> metadata;

    public Long getId() {
        return id;
    }

    public TilesetEntity getTileset() {
        return tileset;
    }

    public void setTileset(TilesetEntity tileset) {
        this.tileset = tileset;
    }

    public ExtractedTileEntity getExtractedTile() {
        return extractedTile;
    }

    public void setExtractedTile(ExtractedTileEntity extractedTile) {
        this.extractedTile = extractedTile;
    }

    public int getTileIndex() {
        return tileIndex;
    }

    public void setTileIndex(int tileIndex) {
        this.tileIndex = tileIndex;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }
}
