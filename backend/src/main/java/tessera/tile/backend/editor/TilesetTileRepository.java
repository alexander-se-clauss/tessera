package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.TilesetTileEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TilesetTileRepository extends JpaRepository<TilesetTileEntity, Long> {

    List<TilesetTileEntity> findByTilesetIdOrderByTileIndexAsc(Long tilesetId);

    void deleteByTilesetId(Long tilesetId);
}
