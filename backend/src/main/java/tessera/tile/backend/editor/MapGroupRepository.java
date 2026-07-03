package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.MapGroupEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MapGroupRepository extends JpaRepository<MapGroupEntity, Long> {
    List<MapGroupEntity> findByProjectIdOrderByCreatedAtAsc(Long projectId);
    Optional<MapGroupEntity> findByProjectIdAndIsOverworldTrue(Long projectId);
    boolean existsByProjectIdAndIsOverworldTrue(Long projectId);
}
