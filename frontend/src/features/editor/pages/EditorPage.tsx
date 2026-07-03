import { Box, Button, Typography } from '@mui/material'
import { ConfigurePlayerDialog } from '../components/configure-player/ConfigurePlayerDialog'
import { GameOverlay } from '../preview/components/GameOverlay'
import type { SpriteDefinition } from '../sprites/types/sprite'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { editorTokens } from '../../../app/theme'
import { clearSession, selectCurrentUser } from '../../auth/model/authSlice'
import { clearStoredToken } from '../../auth/model/authStorage'
import {
  clearProjectSelection,
  selectActiveGroupId,
  selectActiveTab,
  selectActiveMapId,
  selectActiveProjectId,
  selectActiveTilesetId,
  selectSelectedCell,
  selectSelectedEventId,
  selectSelectedEventTypeForPlacement,
  selectSelectedObjectId,
  selectSelectedTileIndex,
  selectTemporaryEntryPoint,
  setActiveGroupId,
  setActiveMapId,
  setActiveProjectId,
  setActiveTilesetId,
  setActiveTab,
  setSelectedCell,
  setSelectedEventId,
  setSelectedEventTypeForPlacement,
  setSelectedTileIndex,
} from '../model/editorSlice'
import type { DrawMode, EventType, GameMap, MapGroup, PlayerConfig, Tileset } from '../model/types'
import {
  useCreateMapGroupMutation,
  useCreateMapMutation,
  useCreateProjectMutation,
  useCreateTilesetMutation,
  useDeleteMapMutation,
  useGetMapQuery,
  useListEventsQuery,
  useListMapGroupsQuery,
  useListMapsQuery,
  useListObjectTypesQuery,
  useListProjectsQuery,
  useListTilesetsQuery,
  useUpdateMapMutation,
  useUpdateProjectMutation,
} from '../api/editorApi'
import {
  STANDARD_MAP_COLUMNS,
  STANDARD_MAP_ROWS,
} from '../model/mapConstants'
import { EditorBody } from '../components/EditorBody'
import { EditorTopBar } from '../components/EditorTopBar'
import { MapContextMenu } from '../components/MapContextMenu'
import { TilesetImportDialog } from '../assets/components/TilesetImportDialog'
import { EditTilesetDialog } from '../assets/components/EditTilesetDialog'
import { CreateTilesetDialog } from '../assets/components/CreateTilesetDialog'
import { ImportSpriteDialog } from '../sprites/components/ImportSpriteDialog'
import { CreateMapDialog } from '../components/dialogs/CreateMapDialog'
import { MapPropertiesDialog } from '../components/dialogs/MapPropertiesDialog'
import { CreateGroupDialog } from '../components/dialogs/CreateGroupDialog'
import { AssetChooserDialog } from '../components/dialogs/AssetChooserDialog'
import { CreateProjectDialog } from '../components/dialogs/CreateProjectDialog'
import { LoadProjectDialog } from '../components/dialogs/LoadProjectDialog'
import { ProjectPropertiesDialog } from '../components/dialogs/ProjectPropertiesDialog'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../components/AppDialog'
import { useMapPainter } from '../hooks/useMapPainter'
import { recordRecentProject } from '../model/recentProjectsSlice'

export function EditorPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)
  const activeProjectId = useAppSelector(selectActiveProjectId)
  const activeMapId = useAppSelector(selectActiveMapId)
  const activeGroupId = useAppSelector(selectActiveGroupId)
  const activeTilesetId = useAppSelector(selectActiveTilesetId)
  const activeTab = useAppSelector(selectActiveTab)
  const selectedTileIndex = useAppSelector(selectSelectedTileIndex)
  const selectedCell = useAppSelector(selectSelectedCell)
  const selectedEventId = useAppSelector(selectSelectedEventId)
  const selectedObjectId = useAppSelector(selectSelectedObjectId)
  const selectedEventTypeForPlacement = useAppSelector(selectSelectedEventTypeForPlacement)
  const temporaryEntryPoint = useAppSelector(selectTemporaryEntryPoint)

  const [draftMap, setDraftMap] = useState<GameMap | null>(null)
  const [assetImportOpen, setAssetImportOpen] = useState(false)
  const [createTilesetOpen, setCreateTilesetOpen] = useState(false)
  const [spriteImportOpen, setSpriteImportOpen] = useState(false)
  const [editingTileset, setEditingTileset] = useState<Tileset | null>(null)
  const [editingSprite, setEditingSprite] = useState<Tileset | null>(null)
  const [assetChooser, setAssetChooser] = useState<null | { assetType: 'environment' | 'character' }>(null)
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false)
  const [loadProjectDialogOpen, setLoadProjectDialogOpen] = useState(false)
  const [createMapDialogOpen, setCreateMapDialogOpen] = useState(false)
  const [createMapTargetGroupId, setCreateMapTargetGroupId] = useState<number | null>(null)
  const [mapPropertiesOpen, setMapPropertiesOpen] = useState(false)
  const [deleteMapConfirmOpen, setDeleteMapConfirmOpen] = useState(false)
  const [createGroupDialogOpen, setCreateGroupDialogOpen] = useState(false)
  const [projectPropertiesOpen, setProjectPropertiesOpen] = useState(false)
  const [playerConfigOpen, setPlayerConfigOpen] = useState(false)
  const [gameRunning, setGameRunning] = useState(false)
  const [gamePaused, setGamePaused] = useState(false)
  const [pendingPlayAfterMapLoad, setPendingPlayAfterMapLoad] = useState(false)
  const [savedPlayerConfig, setSavedPlayerConfig] = useState<PlayerConfig | null>(null)

  const { data: projects = [], isLoading: isProjectsLoading } = useListProjectsQuery()
  const [createProject, { isLoading: isCreatingProject }] = useCreateProjectMutation()
  const { data: maps = [] } = useListMapsQuery(activeProjectId as number, { skip: !activeProjectId })
  const { data: tilesets = [] } = useListTilesetsQuery(activeProjectId as number, { skip: !activeProjectId })
  const { data: mapGroups = [] as MapGroup[] } = useListMapGroupsQuery(activeProjectId as number, { skip: !activeProjectId })
  const { data: serverObjectTypes = [] } = useListObjectTypesQuery({ projectId: activeProjectId as number }, { skip: !activeProjectId })
  const { data: activeMapResponse } = useGetMapQuery(activeMapId as number, { skip: !activeMapId })
  const activeMapResponseRef = useRef(activeMapResponse)
  activeMapResponseRef.current = activeMapResponse
  const activeMapResponseId = activeMapResponse?.id ?? null
  const activeMapResponseUpdatedAt = activeMapResponse?.updatedAt ?? null
  const { data: events = [] } = useListEventsQuery(activeMapId as number, { skip: !activeMapId })
  const [createMap] = useCreateMapMutation()
  const [createMapGroup] = useCreateMapGroupMutation()
  const [updateMap] = useUpdateMapMutation()
  const [deleteMap] = useDeleteMapMutation()
  const [updateProject] = useUpdateProjectMutation()
  const [createTileset] = useCreateTilesetMutation()

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null
  const effectivePlayerConfig = savedPlayerConfig ?? activeProject?.playerConfig ?? null
  const activeGroup = mapGroups.find((g) => g.id === activeGroupId) ?? null
  const environmentTilesets = tilesets.filter((t) => t.assetType === 'environment')
  const sprites = tilesets.filter((t) => t.assetType === 'character')
  const activeTileset = environmentTilesets.find((t) => t.id === activeTilesetId) ?? null
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null
  const selectedObject = draftMap?.objects.find((o) => o.id === selectedObjectId) ?? null

  const currentMapEntryPoint = activeProject?.entryPoint && draftMap && activeProject.entryPoint.mapId === draftMap.id
    ? { x: activeProject.entryPoint.x, y: activeProject.entryPoint.y }
    : null
  const currentMapTemporaryEntryPoint = draftMap?.spawnPoint
    ? { mapId: draftMap.id, x: draftMap.spawnPoint.x, y: draftMap.spawnPoint.y }
    : temporaryEntryPoint && draftMap && temporaryEntryPoint.mapId === draftMap.id
      ? temporaryEntryPoint
      : null
  const requestedEntryPoint = currentMapTemporaryEntryPoint ?? activeProject?.entryPoint ?? null
  const gameSpawnPoint = requestedEntryPoint && draftMap?.id === requestedEntryPoint.mapId
    ? { x: requestedEntryPoint.x, y: requestedEntryPoint.y }
    : null

  const playerSpriteTileset = effectivePlayerConfig
    ? sprites.find((s) => s.id === effectivePlayerConfig.spriteId) ?? null
    : null
  const playerSpriteDefinition = playerSpriteTileset ? tilesetToSpriteDefinition(playerSpriteTileset) : null
  const canPlay = Boolean(requestedEntryPoint && activeProject)
  const canStartPreview = Boolean(gameSpawnPoint && playerSpriteDefinition && effectivePlayerConfig && draftMap && environmentTilesets.length > 0)

  const painter = useMapPainter({
    draftMap,
    onUpdateDraftMap: setDraftMap,
    events,
    serverObjectTypes,
    environmentTilesets,
    activeProjectId,
  })

  useEffect(() => {
    setSavedPlayerConfig(null)
  }, [activeProjectId, activeProject?.playerConfig])

  useEffect(() => {
    if (activeGroupId) return
    if (!activeProjectId || maps.length === 0) {
      if (activeProjectId && maps.length === 0) dispatch(setActiveMapId(null))
      return
    }
    if (!activeMapId || !maps.some((m) => m.id === activeMapId)) {
      dispatch(setActiveMapId(maps[0].id))
    }
  }, [activeGroupId, activeMapId, activeProjectId, dispatch, maps])

  useEffect(() => {
    if (!activeProjectId || environmentTilesets.length === 0) {
      if (activeProjectId && environmentTilesets.length === 0) dispatch(setActiveTilesetId(null))
      return
    }
    if (activeTilesetId && environmentTilesets.some((t) => t.id === activeTilesetId)) return
    const usedIds = new Set(
      draftMap?.layers.flatMap((l) => l.tiles.map((t) => t.tilesetId).filter((id): id is number => id !== null)) ?? [],
    )
    const used = environmentTilesets.find((t) => usedIds.has(t.id))
    dispatch(setActiveTilesetId((used ?? environmentTilesets[0]).id))
  }, [activeProjectId, activeTilesetId, dispatch, draftMap, environmentTilesets])

  useEffect(() => {
    if (activeProjectId && !isProjectsLoading && !activeProject) {
      dispatch(clearProjectSelection())
      navigate('/projects', { replace: true })
    }
  }, [activeProject, activeProjectId, dispatch, isProjectsLoading, navigate])

  useEffect(() => {
    const response = activeMapResponseRef.current
    if (response && response.id === activeMapId) {
      setDraftMap({ ...response, objects: response.objects ?? [] })
    } else if (!activeMapId) {
      setDraftMap(null)
    }
  }, [activeMapId, activeMapResponseId, activeMapResponseUpdatedAt])

  const handleLogout = () => {
    clearStoredToken()
    dispatch(clearSession())
    dispatch(clearProjectSelection())
  }

  const handleCreateProject = async (name: string, description: string) => {
    const project = await createProject({ name, description: description || undefined }).unwrap()
    dispatch(setActiveProjectId(project.id))
    dispatch(recordRecentProject({ id: project.id, name: project.name }))
    navigate('/dashboard', { replace: true })
  }

  const handleCreateMap = async (name: string) => {
    if (!activeProjectId) return
    const targetGroupId = createMapTargetGroupId
    const map = await createMap({
      projectId: activeProjectId,
      body: { name, width: STANDARD_MAP_COLUMNS, height: STANDARD_MAP_ROWS, mapGroupId: targetGroupId ?? undefined },
    }).unwrap()
    if (targetGroupId != null) {
      dispatch(setActiveMapId(null))
      dispatch(setActiveGroupId(targetGroupId))
    } else {
      dispatch(setActiveGroupId(null))
      dispatch(setActiveMapId(map.id))
    }
  }

  const handleAddMapToGroup = (groupId: number) => {
    setCreateMapTargetGroupId(groupId)
    setCreateMapDialogOpen(true)
  }

  const handleCreateGroup = async (name: string, type: import('../model/types').MapGroupType) => {
    if (!activeProjectId) return
    const group = await createMapGroup({
      projectId: activeProjectId,
      body: {
        name,
        type,
        isOverworld: type === 'world' && !mapGroups.some((g) => g.isOverworld),
      },
    }).unwrap()
    dispatch(setActiveMapId(null))
    dispatch(setActiveGroupId(group.id))
  }

  const handleSaveMapProperties = async (name: string) => {
    if (!draftMap) return
    try {
      const updated = await updateMap({
        mapId: draftMap.id,
        body: {
          name,
          width: draftMap.width,
          height: draftMap.height,
          tileWidth: draftMap.tileWidth,
          tileHeight: draftMap.tileHeight,
          layers: draftMap.layers,
          objects: draftMap.objects ?? [],
          spawnPoint: draftMap.spawnPoint ?? null,
        },
      }).unwrap()
      setDraftMap(updated)
      setMapPropertiesOpen(false)
    } catch { }
  }

  const handleRequestDeleteMap = () => {
    if (!draftMap) return
    setDeleteMapConfirmOpen(true)
  }

  const handleDeleteMap = async () => {
    if (!activeProjectId || !draftMap) return
    try {
      await deleteMap({ mapId: draftMap.id, projectId: activeProjectId }).unwrap()
      dispatch(setActiveMapId(null))
      dispatch(setSelectedCell(null))
      dispatch(setSelectedEventId(null))
      setDraftMap(null)
      setMapPropertiesOpen(false)
      setDeleteMapConfirmOpen(false)
    } catch { }
  }

  const handleSaveProjectProperties = async (entryPoint: { mapId: number; x: number; y: number } | null) => {
    if (!activeProject) return
    try {
      await updateProject({
        projectId: activeProject.id,
        body: {
          name: activeProject.name,
          description: activeProject.description ?? undefined,
          entryPoint: entryPoint ?? null,
          playerConfig: effectivePlayerConfig,
          overworldGroupId: activeProject.overworldGroupId,
        },
      }).unwrap()
      setProjectPropertiesOpen(false)
    } catch { }
  }

  const handleSavePlayerConfig = async (config: PlayerConfig) => {
    if (!activeProject) return
    try {
      const saved = await updateProject({
        projectId: activeProject.id,
        body: {
          name: activeProject.name,
          description: activeProject.description ?? undefined,
          entryPoint: activeProject.entryPoint ?? null,
          playerConfig: config,
          overworldGroupId: activeProject.overworldGroupId,
        },
      }).unwrap()
      setSavedPlayerConfig(saved.playerConfig ?? config)
      if (gameRunning) { setGameRunning(false); setGamePaused(false) }
      setPlayerConfigOpen(false)
    } catch { }
  }

  const handleGoToPlayerSprite = () => {
    const spriteId = activeProject?.playerConfig?.spriteId
    if (spriteId) dispatch(setActiveTilesetId(spriteId))
  }

  const handlePlayPause = () => {
    if (!gameRunning) {
      if (!requestedEntryPoint) return
      if (draftMap?.id !== requestedEntryPoint.mapId) {
        setPendingPlayAfterMapLoad(true)
        dispatch(setActiveGroupId(null))
        dispatch(setActiveMapId(requestedEntryPoint.mapId))
        return
      }
      if (!effectivePlayerConfig || !playerSpriteDefinition) {
        setPlayerConfigOpen(true)
        return
      }
      if (environmentTilesets.length === 0) {
        setAssetChooser({ assetType: 'environment' })
        return
      }
      setGameRunning(true)
      setGamePaused(false)
    } else {
      setGamePaused((prev) => !prev)
    }
  }

  useEffect(() => {
    if (!pendingPlayAfterMapLoad) return
    if (!requestedEntryPoint || draftMap?.id !== requestedEntryPoint.mapId) return
    setPendingPlayAfterMapLoad(false)
    if (!effectivePlayerConfig || !playerSpriteDefinition) {
      setPlayerConfigOpen(true)
      return
    }
    if (environmentTilesets.length === 0) {
      setAssetChooser({ assetType: 'environment' })
      return
    }
    setGameRunning(true)
    setGamePaused(false)
  }, [draftMap?.id, effectivePlayerConfig, environmentTilesets.length, pendingPlayAfterMapLoad, playerSpriteDefinition, requestedEntryPoint])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key !== 'F10') return
      event.preventDefault()
      handlePlayPause()
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  })

  const handleImportedSprite = (spriteId: number) => {
    dispatch(setActiveTilesetId(spriteId))
    setSpriteImportOpen(false)
    setEditingSprite(null)
  }

  const handleImportedTileset = (tilesetId: number) => {
    dispatch(setActiveTilesetId(tilesetId))
    setAssetImportOpen(false)
    setEditingTileset(null)
  }

  const handleCreateEditorTileset = async (payload: { name: string; tileWidth: number; tileHeight: number }) => {
    if (!activeProjectId) return
    const tileset = await createTileset({
      projectId: activeProjectId,
      body: { name: payload.name, tileWidth: payload.tileWidth, tileHeight: payload.tileHeight },
    }).unwrap()
    dispatch(setActiveTilesetId(tileset.id))
    setEditingTileset(null)
    setAssetImportOpen(true)
  }

  const handleCloseProject = () => {
    dispatch(clearProjectSelection())
    navigate('/projects')
  }

  const handleSelectMap = (mapId: number) => {
    painter.handleSelectMap(mapId)
    dispatch(setActiveGroupId(null))
    dispatch(setActiveMapId(mapId))
  }

  const handleSelectGroup = (groupId: number) => {
    const group = mapGroups.find((g) => g.id === groupId)
    const groupMaps = maps.filter((m) => m.mapGroupId === groupId)
    if (group?.type === 'area' && groupMaps.length === 1) {
      handleSelectMap(groupMaps[0].id)
      return
    }
    if (activeGroupId === groupId) {
      dispatch(setActiveGroupId(null))
    } else {
      dispatch(setActiveMapId(null))
      dispatch(setActiveGroupId(groupId))
    }
  }

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: editorTokens.background.app, fontFamily: 'inherit' }}>
        <EditorTopBar
          user={user}
          hasActiveProject={Boolean(activeProject)}
          hasActiveMap={Boolean(draftMap)}
          playerConfig={effectivePlayerConfig}
          spawnPoint={currentMapEntryPoint}
          temporaryEntryPoint={currentMapTemporaryEntryPoint}
          gameRunning={gameRunning}
          gamePaused={gamePaused}
          onLogout={handleLogout}
          onOpenCreateProject={() => setCreateProjectDialogOpen(true)}
          onOpenLoadProject={() => setLoadProjectDialogOpen(true)}
          onOpenProjectProperties={() => setProjectPropertiesOpen(true)}
          onCloseProject={handleCloseProject}
          onOpenCreateMap={() => setCreateMapDialogOpen(true)}
          onOpenMapProperties={() => { if (draftMap) setMapPropertiesOpen(true) }}
          onDeleteMap={handleRequestDeleteMap}
          onOpenCreateTileset={() => setCreateTilesetOpen(true)}
          onOpenImportTiles={() => { setEditingTileset(null); setAssetImportOpen(true) }}
          onEditExistingTileset={() => setAssetChooser({ assetType: 'environment' })}
          onOpenImportSprite={() => setSpriteImportOpen(true)}
          onEditExistingSprite={() => setAssetChooser({ assetType: 'character' })}
          onOpenPlayerConfig={() => setPlayerConfigOpen(true)}
          onGoToPlayerSprite={handleGoToPlayerSprite}
        />
        <EditorBody
          activeProject={activeProject}
          maps={maps}
          mapGroups={mapGroups as MapGroup[]}
          activeMap={draftMap}
          activeGroup={activeGroup}
          tilesets={environmentTilesets}
          activeTileset={activeTileset}
          activeTilesetId={activeTilesetId}
          activeTab={activeTab}
          drawMode={painter.drawMode}
          selectedTileIndex={selectedTileIndex}
          selectedObjectTypeId={painter.selectedObjectTypeId}
          selectedObjectId={selectedObjectId}
          selectedCell={selectedCell}
          selectedArea={painter.selectedArea}
          hoveredCell={painter.hoveredCell}
          selectedEvent={selectedEvent}
          selectedObject={selectedObject}
          events={events}
          gameRunning={gameRunning}
          gamePaused={gamePaused}
          canPlay={canPlay}
          objectTypes={painter.objectTypes}
          onUpdateEvent={painter.handleUpdateEventProperties}
          onDeleteEvent={painter.handleDeleteEvent}
          onSelectMap={handleSelectMap}
          onSelectGroup={handleSelectGroup}
          onSelectTileset={(tilesetId) => dispatch(setActiveTilesetId(tilesetId))}
          onAddMap={() => setCreateMapDialogOpen(true)}
          onCreateGroup={() => setCreateGroupDialogOpen(true)}
          onAddMapToGroup={handleAddMapToGroup}
          onSelectTab={painter.handleSelectTab}
          onSelectDrawMode={(mode: DrawMode) => painter.setDrawMode(mode)}
          onSelectTile={(tileIndex) => {
            painter.setSelectedObjectTypeId(null)
            dispatch(setSelectedTileIndex(tileIndex))
            if (painter.drawMode === 'area' && painter.selectedArea && tileIndex !== null) {
              painter.handlePaintSelectedArea(tileIndex)
            } else if (painter.drawMode === 'area' && painter.selectedArea && tileIndex === null) {
              painter.handleEraseSelectedArea()
            }
          }}
          onSelectObjectType={(objectTypeId) => {
            painter.setSelectedObjectTypeId(objectTypeId)
            dispatch(setSelectedTileIndex(null))
            dispatch(setActiveTab('objects'))
          }}
          selectedEventTypeForPlacement={selectedEventTypeForPlacement}
          onSelectEventType={(eventType: EventType | null) => dispatch(setSelectedEventTypeForPlacement(eventType))}
          onUpdateObject={painter.handleUpdateObject}
          spawnPoint={currentMapEntryPoint}
          temporaryEntryPoint={currentMapTemporaryEntryPoint}
          onCellClick={painter.handlePaintCell}
          onCellMouseDown={painter.handleAreaSelectionStart}
          onCellHover={painter.handleCellHover}
          onCellMouseUp={painter.handleAreaSelectionEnd}
          onCellContextMenu={painter.handleCellContextMenu}
          onPlayPause={handlePlayPause}
          activeMapId={activeMapId}
          activeGroupId={activeGroupId}
        />
      </Box>

      {gameRunning && canStartPreview && draftMap && playerSpriteDefinition && gameSpawnPoint && effectivePlayerConfig ? (
        <GameOverlay
          key={`${effectivePlayerConfig.spriteId}:${effectivePlayerConfig.mirrorMovements?.leftToRight ?? false}:${effectivePlayerConfig.mirrorMovements?.rightToLeft ?? false}`}
          map={draftMap}
          events={events}
          tilesets={environmentTilesets}
          objectTypes={painter.objectTypes}
          sprite={playerSpriteDefinition}
          spriteImageSrc={playerSpriteDefinition.imageUrl}
          spawnPoint={gameSpawnPoint}
          playerConfig={effectivePlayerConfig}
          paused={gamePaused}
          onClose={() => { setGameRunning(false); setGamePaused(false) }}
        />
      ) : null}

      {painter.contextMenu ? (
        <MapContextMenu
          menu={painter.contextMenu}
          onClose={painter.handleCloseContextMenu}
          onSetTemporaryEntryPoint={painter.handleSetTemporaryEntryPoint}
          onEraseCell={painter.handleEraseCell}
        />
      ) : null}

      <CreateMapDialog
        open={createMapDialogOpen}
        maps={maps}
        mapGroups={mapGroups as MapGroup[]}
        targetGroupId={createMapTargetGroupId}
        onClose={() => { setCreateMapDialogOpen(false); setCreateMapTargetGroupId(null) }}
        onCreate={handleCreateMap}
      />

      <MapPropertiesDialog
        open={mapPropertiesOpen}
        map={draftMap}
        onClose={() => setMapPropertiesOpen(false)}
        onSave={handleSaveMapProperties}
        onDelete={async () => handleRequestDeleteMap()}
      />

      <AppDialog
        open={deleteMapConfirmOpen}
        onClose={() => setDeleteMapConfirmOpen(false)}
        title="Delete map?"
        maxWidth="xs"
        actions={
          <>
            <Button onClick={() => setDeleteMapConfirmOpen(false)} sx={dialogCancelButtonSx}>Cancel</Button>
            <Button color="error" variant="contained" onClick={() => void handleDeleteMap()} sx={dialogPrimaryButtonSx}>
              Delete map
            </Button>
          </>
        }
      >
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
          Delete "{draftMap?.name ?? 'this map'}"? This cannot be undone.
        </Typography>
      </AppDialog>

      <CreateGroupDialog
        open={createGroupDialogOpen}
        mapGroups={mapGroups as MapGroup[]}
        onClose={() => setCreateGroupDialogOpen(false)}
        onCreate={handleCreateGroup}
      />

      <TilesetImportDialog
        open={assetImportOpen && !editingTileset}
        projectId={activeProject?.id ?? 0}
        projectName={activeProject?.name ?? ''}
        availableTilesets={tilesets}
        editingTileset={null}
        onClose={() => { setAssetImportOpen(false); setEditingTileset(null) }}
        onImported={handleImportedTileset}
      />

      <EditTilesetDialog
        open={assetImportOpen && Boolean(editingTileset)}
        projectId={activeProject?.id ?? 0}
        tileset={editingTileset}
        onClose={() => { setAssetImportOpen(false); setEditingTileset(null) }}
      />

      <CreateTilesetDialog
        open={createTilesetOpen}
        onClose={() => setCreateTilesetOpen(false)}
        onCreate={handleCreateEditorTileset}
      />

      <ImportSpriteDialog
        open={spriteImportOpen}
        projectId={activeProject?.id ?? 0}
        projectName={activeProject?.name ?? ''}
        editingSprite={editingSprite}
        onClose={() => { setSpriteImportOpen(false); setEditingSprite(null) }}
        onImported={handleImportedSprite}
      />

      <AssetChooserDialog
        open={Boolean(assetChooser)}
        assetType={assetChooser?.assetType ?? null}
        environmentTilesets={environmentTilesets}
        sprites={sprites}
        activeTilesetId={activeTilesetId}
        onClose={() => setAssetChooser(null)}
        onEditTileset={(asset) => { setEditingTileset(asset); setAssetImportOpen(true) }}
        onEditSprite={(asset) => { setEditingSprite(asset); setSpriteImportOpen(true) }}
      />

      <CreateProjectDialog
        open={createProjectDialogOpen}
        isCreating={isCreatingProject}
        onClose={() => setCreateProjectDialogOpen(false)}
        onCreate={handleCreateProject}
      />

      <LoadProjectDialog
        open={loadProjectDialogOpen}
        projects={projects}
        activeProjectId={activeProjectId}
        onClose={() => setLoadProjectDialogOpen(false)}
        onLoad={(projectId, projectName) => {
          dispatch(setActiveProjectId(projectId))
          dispatch(recordRecentProject({ id: projectId, name: projectName }))
          navigate('/dashboard', { replace: true })
        }}
      />

      <ProjectPropertiesDialog
        open={projectPropertiesOpen}
        activeProject={activeProject}
        maps={maps}
        onClose={() => setProjectPropertiesOpen(false)}
        onSave={handleSaveProjectProperties}
      />

      <ConfigurePlayerDialog
        open={playerConfigOpen}
        sprites={sprites}
        currentConfig={effectivePlayerConfig}
        onClose={() => setPlayerConfigOpen(false)}
        onSave={(config) => void handleSavePlayerConfig(config)}
      />
    </>
  )
}

function tilesetToSpriteDefinition(tileset: Tileset): SpriteDefinition {
  const meta = tileset.metadata as {
    states?: SpriteDefinition['states']
    blockedColors?: string[]
    baseFrameWidth?: number
    baseFrameHeight?: number
  }
  return {
    id: String(tileset.id),
    projectId: String(tileset.id),
    name: tileset.name,
    imageUrl: tileset.imageUrl,
    blockedColors: meta.blockedColors ?? [],
    baseFrameWidth: meta.baseFrameWidth ?? tileset.tileWidth,
    baseFrameHeight: meta.baseFrameHeight ?? tileset.tileHeight,
    columns: tileset.columns,
    rows: tileset.rows,
    states: meta.states ?? [],
    createdAt: tileset.createdAt,
    updatedAt: tileset.updatedAt,
  }
}
