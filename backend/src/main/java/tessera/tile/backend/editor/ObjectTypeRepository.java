package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.ObjectTypeEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectTypeRepository extends JpaRepository<ObjectTypeEntity, UUID> {

    List<ObjectTypeEntity> findByProjectIdOrderByCreatedAtAsc(Long projectId);

    void deleteByTilesetId(Long tilesetId);
}
