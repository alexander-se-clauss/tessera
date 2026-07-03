package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.TileGroupEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TileGroupRepository extends JpaRepository<TileGroupEntity, Long> {

    List<TileGroupEntity> findByAssetImportIdOrderByOrderIndexAsc(Long assetImportId);

    void deleteByAssetImportId(Long assetImportId);
}
