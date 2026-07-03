package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.MapEventEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapEventRepository extends JpaRepository<MapEventEntity, Long> {

    List<MapEventEntity> findByMapIdOrderByUpdatedAtDesc(Long mapId);
}
