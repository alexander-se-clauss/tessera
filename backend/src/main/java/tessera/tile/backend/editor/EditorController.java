package tessera.tile.backend.editor;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import tessera.tile.backend.editor.EditorDtos.AddTilesResponse;
import tessera.tile.backend.editor.EditorDtos.AssignMapToGroupRequest;
import tessera.tile.backend.editor.EditorDtos.EventRequest;
import tessera.tile.backend.editor.EditorDtos.EventResponse;
import tessera.tile.backend.editor.EditorDtos.GroupNeighborsResponse;
import tessera.tile.backend.editor.EditorDtos.MapCreateRequest;
import tessera.tile.backend.editor.EditorDtos.MapGroupRequest;
import tessera.tile.backend.editor.EditorDtos.MapGroupResponse;
import tessera.tile.backend.editor.EditorDtos.MapResponse;
import tessera.tile.backend.editor.EditorDtos.MapUpdateRequest;
import tessera.tile.backend.editor.EditorDtos.MoveTileRequest;
import tessera.tile.backend.editor.EditorDtos.ObjectTypeRequest;
import tessera.tile.backend.editor.EditorDtos.ObjectTypeResponse;
import tessera.tile.backend.editor.EditorDtos.ProjectRequest;
import tessera.tile.backend.editor.EditorDtos.ProjectResponse;
import tessera.tile.backend.editor.EditorDtos.SaveTilesetRequest;
import tessera.tile.backend.editor.EditorDtos.TilesetRequest;
import tessera.tile.backend.editor.EditorDtos.TilesetResponse;
import tessera.tile.backend.editor.EditorDtos.TilesetGroupRequest;
import tessera.tile.backend.editor.EditorDtos.TileRegionRequest;
import tessera.tile.backend.editor.model.AssetType;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import tessera.tile.backend.security.JwtService;

@RestController
@RequestMapping("/api")
public class EditorController {
    private static final ObjectMapper OBJECT_MAPPER = JsonMapper.builder().findAndAddModules().build();
    private static final TypeReference<List<TileRegionRequest>> TILE_REGION_LIST = new TypeReference<>() {};
    private static final TypeReference<List<Map<String, Object>>> GROUP_LIST = new TypeReference<>() {};

    private final EditorService editorService;
    private final AssetImportService assetImportService;
    private final JwtService jwtService;

    public EditorController(EditorService editorService, AssetImportService assetImportService, JwtService jwtService) {
        this.editorService = editorService;
        this.assetImportService = assetImportService;
        this.jwtService = jwtService;
    }

    // ── Projects ─────────────────────────────────────────────────────────────

    @GetMapping("/projects")
    public List<ProjectResponse> listProjects(Principal principal) {
        return editorService.listProjects(principal.getName());
    }

    @PostMapping("/projects")
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse createProject(Principal principal, @Valid @RequestBody ProjectRequest request) {
        return editorService.createProject(principal.getName(), request);
    }

    @GetMapping("/projects/{projectId}")
    public ProjectResponse getProject(@PathVariable Long projectId, Principal principal) {
        return editorService.getProject(projectId, principal.getName());
    }

    @PutMapping("/projects/{projectId}")
    public ProjectResponse updateProject(
            @PathVariable Long projectId, Principal principal, @Valid @RequestBody ProjectRequest request) {
        return editorService.updateProject(projectId, principal.getName(), request);
    }

    @DeleteMapping("/projects/{projectId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable Long projectId, Principal principal) {
        editorService.deleteProject(projectId, principal.getName());
    }

    // ── Maps ─────────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/maps")
    public List<MapResponse> listMaps(@PathVariable Long projectId, Principal principal) {
        return editorService.listMaps(projectId, principal.getName());
    }

    @PostMapping("/projects/{projectId}/maps")
    @ResponseStatus(HttpStatus.CREATED)
    public MapResponse createMap(
            @PathVariable Long projectId, Principal principal, @Valid @RequestBody MapCreateRequest request) {
        return editorService.createMap(projectId, principal.getName(), request);
    }

    @GetMapping("/maps/{mapId}")
    public MapResponse getMap(@PathVariable Long mapId, Principal principal) {
        return editorService.getMap(mapId, principal.getName());
    }

    @PutMapping("/maps/{mapId}")
    public MapResponse updateMap(
            @PathVariable Long mapId, Principal principal, @Valid @RequestBody MapUpdateRequest request) {
        return editorService.updateMap(mapId, principal.getName(), request);
    }

    @DeleteMapping("/maps/{mapId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMap(@PathVariable Long mapId, Principal principal) {
        editorService.deleteMap(mapId, principal.getName());
    }

    @PutMapping("/maps/{mapId}/group")
    public MapResponse assignMapToGroup(
            @PathVariable Long mapId, Principal principal, @Valid @RequestBody AssignMapToGroupRequest request) {
        return editorService.assignMapToGroup(mapId, principal.getName(), request);
    }

    // ── Map groups ────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/map-groups")
    public List<MapGroupResponse> listMapGroups(@PathVariable Long projectId, Principal principal) {
        return editorService.listMapGroups(projectId, principal.getName());
    }

    @PostMapping("/projects/{projectId}/map-groups")
    @ResponseStatus(HttpStatus.CREATED)
    public MapGroupResponse createMapGroup(
            @PathVariable Long projectId, Principal principal, @Valid @RequestBody MapGroupRequest request) {
        return editorService.createMapGroup(projectId, principal.getName(), request);
    }

    @GetMapping("/map-groups/{groupId}")
    public MapGroupResponse getMapGroup(@PathVariable Long groupId, Principal principal) {
        return editorService.getMapGroup(groupId, principal.getName());
    }

    @PutMapping("/map-groups/{groupId}")
    public MapGroupResponse updateMapGroup(
            @PathVariable Long groupId, Principal principal, @Valid @RequestBody MapGroupRequest request) {
        return editorService.updateMapGroup(groupId, principal.getName(), request);
    }

    @DeleteMapping("/map-groups/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMapGroup(@PathVariable Long groupId, Principal principal) {
        editorService.deleteMapGroup(groupId, principal.getName());
    }

    @GetMapping("/map-groups/{groupId}/neighbors")
    public GroupNeighborsResponse getGroupNeighbors(
            @PathVariable Long groupId,
            @RequestParam int col,
            @RequestParam int row,
            Principal principal) {
        return editorService.getGroupNeighbors(groupId, principal.getName(), col, row);
    }

    // ── Tilesets ──────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/tilesets")
    public List<TilesetResponse> listTilesets(@PathVariable Long projectId, Principal principal) {
        return editorService.listTilesets(projectId, principal.getName());
    }

    @PostMapping("/projects/{projectId}/tilesets")
    @ResponseStatus(HttpStatus.CREATED)
    public TilesetResponse createTileset(
            @PathVariable Long projectId, Principal principal, @Valid @RequestBody TilesetRequest request) {
        return editorService.createTileset(projectId, principal.getName(), request);
    }

    @GetMapping("/tilesets/{tilesetId}")
    public TilesetResponse getTileset(@PathVariable Long tilesetId, Principal principal) {
        return editorService.getTileset(tilesetId, principal.getName());
    }

    @PutMapping("/tilesets/{tilesetId}")
    public TilesetResponse updateTileset(
            @PathVariable Long tilesetId, Principal principal, @Valid @RequestBody TilesetRequest request) {
        return editorService.updateTileset(tilesetId, principal.getName(), request);
    }

    @DeleteMapping("/tilesets/{tilesetId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTileset(@PathVariable Long tilesetId, Principal principal) {
        editorService.deleteTileset(tilesetId, principal.getName());
    }

    @PostMapping(value = "/tilesets/{tilesetId}/tiles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public AddTilesResponse addTiles(
            @PathVariable Long tilesetId,
            Principal principal,
            @RequestParam("sourceImage") MultipartFile sourceImage,
            @RequestParam("tiles") String tiles
    ) throws JsonProcessingException {
        return editorService.addTiles(tilesetId, principal.getName(), sourceImage, OBJECT_MAPPER.readValue(tiles, TILE_REGION_LIST));
    }

    @DeleteMapping("/tilesets/{tilesetId}/tiles/{col}/{row}")
    public TilesetResponse removeTile(@PathVariable Long tilesetId, @PathVariable int col, @PathVariable int row, Principal principal) {
        return editorService.removeTile(tilesetId, col, row, principal.getName());
    }

    @PutMapping(value = "/tilesets/{tilesetId}/tiles/{col}/{row}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TilesetResponse restitchTile(
            @PathVariable Long tilesetId,
            @PathVariable int col,
            @PathVariable int row,
            Principal principal,
            @RequestParam("sourceImage") MultipartFile sourceImage,
            @RequestParam("tile") String tile
    ) throws JsonProcessingException {
        return editorService.restitchTile(tilesetId, col, row, principal.getName(), sourceImage, OBJECT_MAPPER.readValue(tile, TileRegionRequest.class));
    }

    @PutMapping("/tilesets/{tilesetId}/groups")
    public TilesetResponse updateTilesetGroups(@PathVariable Long tilesetId, Principal principal, @RequestBody String body) throws JsonProcessingException {
        return editorService.updateTilesetGroups(tilesetId, principal.getName(), OBJECT_MAPPER.readValue(body, GROUP_LIST));
    }

    @PostMapping("/tilesets/{tilesetId}/groups")
    @ResponseStatus(HttpStatus.CREATED)
    public TilesetResponse createTilesetGroup(@PathVariable Long tilesetId, Principal principal, @RequestBody TilesetGroupRequest request) {
        return editorService.createTilesetGroup(tilesetId, principal.getName(), request);
    }

    @PutMapping("/tilesets/{tilesetId}/groups/{groupId}")
    public TilesetResponse updateTilesetGroup(@PathVariable Long tilesetId, @PathVariable String groupId, Principal principal, @RequestBody TilesetGroupRequest request) {
        return editorService.updateTilesetGroup(tilesetId, groupId, principal.getName(), request);
    }

    @DeleteMapping("/tilesets/{tilesetId}/groups/{groupId}")
    public TilesetResponse deleteTilesetGroup(@PathVariable Long tilesetId, @PathVariable String groupId, Principal principal) {
        return editorService.deleteTilesetGroup(tilesetId, groupId, principal.getName());
    }

    @PostMapping(value = "/tilesets/{tilesetId}/groups/{groupId}/tiles", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public TilesetResponse assignTileToTilesetGroup(
            @PathVariable Long tilesetId,
            @PathVariable String groupId,
            Principal principal,
            @RequestParam("sourceImage") MultipartFile sourceImage,
            @RequestParam("tile") String tile
    ) throws JsonProcessingException {
        return editorService.assignTileToTilesetGroup(tilesetId, groupId, principal.getName(), sourceImage, OBJECT_MAPPER.readValue(tile, TileRegionRequest.class));
    }

    @DeleteMapping("/tilesets/{tilesetId}/groups/{groupId}/tiles/{col}/{row}")
    public TilesetResponse removeTileFromTilesetGroup(@PathVariable Long tilesetId, @PathVariable String groupId, @PathVariable int col, @PathVariable int row, Principal principal) {
        return editorService.removeTileFromTilesetGroup(tilesetId, groupId, col, row, principal.getName());
    }

    @PostMapping("/tilesets/{tilesetId}/groups/{groupId}/tiles/{col}/{row}/move")
    public TilesetResponse moveTileToTilesetGroup(
            @PathVariable Long tilesetId,
            @PathVariable String groupId,
            @PathVariable int col,
            @PathVariable int row,
            Principal principal,
            @RequestBody MoveTileRequest request
    ) {
        return editorService.moveTileToTilesetGroup(tilesetId, groupId, col, row, principal.getName(), request);
    }

    // ── Events ────────────────────────────────────────────────────────────────

    @GetMapping("/maps/{mapId}/events")
    public List<EventResponse> listEvents(@PathVariable Long mapId, Principal principal) {
        return editorService.listEvents(mapId, principal.getName());
    }

    @PostMapping("/maps/{mapId}/events")
    @ResponseStatus(HttpStatus.CREATED)
    public EventResponse createEvent(
            @PathVariable Long mapId, Principal principal, @Valid @RequestBody EventRequest request) {
        return editorService.createEvent(mapId, principal.getName(), request);
    }

    @PutMapping("/events/{eventId}")
    public EventResponse updateEvent(
            @PathVariable Long eventId, Principal principal, @Valid @RequestBody EventRequest request) {
        return editorService.updateEvent(eventId, principal.getName(), request);
    }

    @DeleteMapping("/events/{eventId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEvent(@PathVariable Long eventId, Principal principal) {
        editorService.deleteEvent(eventId, principal.getName());
    }

    // ── Object types ─────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/object-types")
    public List<ObjectTypeResponse> listObjectTypes(
            @PathVariable Long projectId,
            @RequestParam(required = false) Long tilesetId,
            Principal principal) {
        return editorService.listObjectTypes(projectId, tilesetId, principal.getName());
    }

    @PostMapping("/projects/{projectId}/object-types")
    @ResponseStatus(HttpStatus.CREATED)
    public ObjectTypeResponse createObjectType(
            @PathVariable Long projectId, Principal principal, @Valid @RequestBody ObjectTypeRequest request) {
        return editorService.createObjectType(projectId, principal.getName(), request);
    }

    @GetMapping("/object-types/{id}")
    public ObjectTypeResponse getObjectType(@PathVariable UUID id, Principal principal) {
        return editorService.getObjectType(id, principal.getName());
    }

    @PutMapping("/object-types/{id}")
    public ObjectTypeResponse updateObjectType(
            @PathVariable UUID id, Principal principal, @Valid @RequestBody ObjectTypeRequest request) {
        return editorService.updateObjectType(id, principal.getName(), request);
    }

    @DeleteMapping("/object-types/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteObjectType(@PathVariable UUID id, Principal principal) {
        editorService.deleteObjectType(id, principal.getName());
    }

    // ── Asset imports ─────────────────────────────────────────────────────────

    @PostMapping(path = "/projects/{projectId}/asset-imports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EditorDtos.AssetImportResponse createAssetImport(
            @PathVariable Long projectId,
            Principal principal,
            @RequestParam String name,
            @RequestParam String assetType,
            @RequestParam("file") MultipartFile file
    ) {
        return assetImportService.createImport(
                projectId,
                principal.getName(),
                name,
                AssetType.fromValue(assetType),
                file
        );
    }

    @GetMapping("/asset-imports/{importId}")
    public EditorDtos.AssetImportResponse getAssetImport(
            @PathVariable Long importId,
            Principal principal,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        return assetImportService.getImport(importId, resolveUsername(principal, authorization, null));
    }

    @PostMapping("/asset-imports/{importId}/save-as-tileset")
    public TilesetResponse saveAssetImportAsTileset(
            @PathVariable Long importId,
            Principal principal,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody SaveTilesetRequest request
    ) {
        return assetImportService.saveImportAsTileset(importId, resolveUsername(principal, authorization, null), request);
    }

    private String resolveUsername(Principal principal, String authorization, String accessToken) {
        if (principal != null && principal.getName() != null && !principal.getName().isBlank()) {
            return principal.getName();
        }
        if (authorization != null && authorization.startsWith("Bearer ")) {
            try {
                return jwtService.decode(authorization.substring("Bearer ".length()).trim()).getSubject();
            } catch (JwtException ignored) {
            }
        }
        if (accessToken == null || accessToken.isBlank()) {
            throw new AccessDeniedException("Unauthorized.");
        }
        try {
            return jwtService.decode(accessToken.trim()).getSubject();
        } catch (JwtException exception) {
            throw new AccessDeniedException("Unauthorized.");
        }
    }
}
