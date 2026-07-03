package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.TilesetEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TilesetRepository extends JpaRepository<TilesetEntity, Long> {

    List<TilesetEntity> findByProjectIdOrderByUpdatedAtDesc(Long projectId);

    Optional<TilesetEntity> findBySourceImportId(Long sourceImportId);
}
