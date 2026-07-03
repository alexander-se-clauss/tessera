package tessera.tile.backend.editor;

import tessera.tile.backend.auth.UserAccount;
import tessera.tile.backend.auth.UserAccountRepository;
import tessera.tile.backend.common.NotFoundException;
import tessera.tile.backend.editor.model.AssetImportEntity;
import tessera.tile.backend.editor.model.GameMapEntity;
import tessera.tile.backend.editor.model.MapEventEntity;
import tessera.tile.backend.editor.model.MapGroupEntity;
import tessera.tile.backend.editor.model.ObjectTypeEntity;
import tessera.tile.backend.editor.model.ProjectEntity;
import tessera.tile.backend.editor.model.TilesetEntity;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class EditorAccessService {

    private final UserAccountRepository userAccountRepository;
    private final ProjectRepository projectRepository;
    private final GameMapRepository gameMapRepository;
    private final TilesetRepository tilesetRepository;
    private final MapEventRepository mapEventRepository;
    private final AssetImportRepository assetImportRepository;
    private final MapGroupRepository mapGroupRepository;
    private final ObjectTypeRepository objectTypeRepository;

    public EditorAccessService(
            UserAccountRepository userAccountRepository,
            ProjectRepository projectRepository,
            GameMapRepository gameMapRepository,
            TilesetRepository tilesetRepository,
            MapEventRepository mapEventRepository,
            AssetImportRepository assetImportRepository,
            MapGroupRepository mapGroupRepository,
            ObjectTypeRepository objectTypeRepository
    ) {
        this.userAccountRepository = userAccountRepository;
        this.projectRepository = projectRepository;
        this.gameMapRepository = gameMapRepository;
        this.tilesetRepository = tilesetRepository;
        this.mapEventRepository = mapEventRepository;
        this.assetImportRepository = assetImportRepository;
        this.mapGroupRepository = mapGroupRepository;
        this.objectTypeRepository = objectTypeRepository;
    }

    public UserAccount requireUser(String username) {
        return userAccountRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("Authenticated user was not found."));
    }

    public ProjectEntity requireOwnedProject(Long projectId, String username) {
        ProjectEntity project = projectRepository.findById(projectId)
                .orElseThrow(() -> new NotFoundException("Project was not found."));
        if (!project.getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this project.");
        }
        return project;
    }

    public GameMapEntity requireOwnedMap(Long mapId, String username) {
        GameMapEntity map = gameMapRepository.findById(mapId)
                .orElseThrow(() -> new NotFoundException("Map was not found."));
        if (!map.getProject().getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this map.");
        }
        return map;
    }

    public MapGroupEntity requireOwnedMapGroup(Long groupId, String username) {
        MapGroupEntity group = mapGroupRepository.findById(groupId)
                .orElseThrow(() -> new NotFoundException("Map group was not found."));
        if (!group.getProject().getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this map group.");
        }
        return group;
    }

    public TilesetEntity requireOwnedTileset(Long tilesetId, String username) {
        TilesetEntity tileset = tilesetRepository.findById(tilesetId)
                .orElseThrow(() -> new NotFoundException("Tileset was not found."));
        if (!tileset.getProject().getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this tileset.");
        }
        return tileset;
    }

    public MapEventEntity requireOwnedEvent(Long eventId, String username) {
        MapEventEntity event = mapEventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("Event was not found."));
        if (!event.getMap().getProject().getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this event.");
        }
        return event;
    }

    public AssetImportEntity requireOwnedAssetImport(Long importId, String username) {
        AssetImportEntity assetImport = assetImportRepository.findById(importId)
                .orElseThrow(() -> new NotFoundException("Asset import was not found."));
        if (!assetImport.getProject().getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this asset import.");
        }
        return assetImport;
    }

    public ObjectTypeEntity requireOwnedObjectType(UUID id, String username) {
        ObjectTypeEntity objectType = objectTypeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Object type was not found."));
        if (!objectType.getProject().getOwner().getUsername().equals(username)) {
            throw new AccessDeniedException("You do not have access to this object type.");
        }
        return objectType;
    }
}
