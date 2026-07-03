package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.GameMapEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameMapRepository extends JpaRepository<GameMapEntity, Long> {

    List<GameMapEntity> findByProjectIdOrderByUpdatedAtDesc(Long projectId);
}
