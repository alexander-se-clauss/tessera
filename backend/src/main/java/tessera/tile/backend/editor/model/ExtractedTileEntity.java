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
@Table(name = "extracted_tile")
public class ExtractedTileEntity extends TimestampedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "import_id", nullable = false)
    private AssetImportEntity assetImport;

    @Column(name = "tile_index", nullable = false)
    private int tileIndex;

    @Column(nullable = false, length = 128)
    private String hash;

    @Column(name = "image_path", nullable = false, columnDefinition = "TEXT")
    private String imagePath;

    @Convert(converter = SourceOccurrenceListJsonConverter.class)
    @Column(name = "source_occurrences", nullable = false, columnDefinition = "jsonb")
    @ColumnTransformer(write = "?::jsonb")
    private List<SourceOccurrenceData> sourceOccurrences;

    public Long getId() {
        return id;
    }

    public AssetImportEntity getAssetImport() {
        return assetImport;
    }

    public void setAssetImport(AssetImportEntity assetImport) {
        this.assetImport = assetImport;
    }

    public int getTileIndex() {
        return tileIndex;
    }

    public void setTileIndex(int tileIndex) {
        this.tileIndex = tileIndex;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String hash) {
        this.hash = hash;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public List<SourceOccurrenceData> getSourceOccurrences() {
        return sourceOccurrences;
    }

    public void setSourceOccurrences(List<SourceOccurrenceData> sourceOccurrences) {
        this.sourceOccurrences = sourceOccurrences;
    }
}
