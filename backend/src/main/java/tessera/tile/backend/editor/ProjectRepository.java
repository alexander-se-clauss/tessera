package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.ProjectEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProjectRepository extends JpaRepository<ProjectEntity, Long> {

    List<ProjectEntity> findByOwnerUsernameOrderByUpdatedAtDesc(String username);
}
