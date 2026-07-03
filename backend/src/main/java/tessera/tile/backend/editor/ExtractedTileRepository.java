package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.ExtractedTileEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExtractedTileRepository extends JpaRepository<ExtractedTileEntity, Long> {

    List<ExtractedTileEntity> findByAssetImportIdOrderByTileIndexAsc(Long assetImportId);
}
