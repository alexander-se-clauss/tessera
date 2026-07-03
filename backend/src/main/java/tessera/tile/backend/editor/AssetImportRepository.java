package tessera.tile.backend.editor;

import tessera.tile.backend.editor.model.AssetImportEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AssetImportRepository extends JpaRepository<AssetImportEntity, Long> {
}
