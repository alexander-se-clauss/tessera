import { Box } from '@mui/material'
import { useEffect, useState } from 'react'
import { editorTokens as tok } from '../../../app/theme'
import type { DrawMode, EditorTab, EntryPoint, EventType, GameMap, MapEvent, MapGroup, MapObject, ObjectType, Project, SelectedArea, SelectedCell, SpawnPoint, Tileset } from '../model'
import { CenterEditor } from './CenterEditor'
import { InspectorPanel } from './InspectorPanel'
import { ProjectTreePanel } from './ProjectTreePanel'
import { GroupEditor } from '../groups/GroupEditor'
import { GroupDetailPanel } from '../groups/GroupDetailPanel'
import { ToolRail } from './ToolRail'

type EditorBodyProps = {
  activeProject: Project | null
  maps: GameMap[]
  mapGroups: MapGroup[]
  activeMap: GameMap | null
  activeGroup: MapGroup | null
  tilesets: Tileset[]
  activeTileset: Tileset | null
  activeTilesetId: number | null
  activeTab: EditorTab
  drawMode: DrawMode
  selectedTileIndex: number | null
  selectedObjectTypeId: string | null
  selectedObjectId: string | null
  selectedCell: SelectedCell | null
  selectedArea: SelectedArea | null
  hoveredCell: SelectedCell | null
  selectedEvent: MapEvent | null
  selectedObject: MapObject | null
  events: MapEvent[]
  gameRunning: boolean
  gamePaused: boolean
  canPlay: boolean
  objectTypes: ObjectType[]
  onSelectMap: (mapId: number) => void
  onSelectGroup: (groupId: number) => void
  onSelectTileset: (tilesetId: number | null) => void
  onAddMap: () => void
  onCreateGroup: () => void
  onAddMapToGroup: (groupId: number) => void
  onSelectTab: (tab: EditorTab) => void
  onSelectDrawMode: (drawMode: DrawMode) => void
  onSelectTile: (tileIndex: number | null) => void
  onSelectObjectType: (objectTypeId: string | null) => void
  selectedEventTypeForPlacement: EventType | null
  onSelectEventType: (eventType: EventType | null) => void
  onUpdateEvent: (event: MapEvent, properties: Record<string, unknown>, objectTypeId?: string | null) => Promise<void>
  onDeleteEvent: (event: MapEvent) => Promise<void>
  onUpdateObject: (objectId: string, updates: Partial<MapObject>) => void
  onCellClick: (x: number, y: number) => void
  onCellMouseDown: (x: number, y: number) => void
  onCellHover: (x: number, y: number) => void
  onCellMouseUp: (x: number, y: number) => void
  spawnPoint: SpawnPoint | null
  temporaryEntryPoint: EntryPoint | null
  onCellContextMenu: (mouseX: number, mouseY: number, cellX: number, cellY: number) => void
  onPlayPause: () => void
  activeMapId: number | null
  activeGroupId: number | null
}

export function EditorBody(props: EditorBodyProps) {
  const {
    activeProject,
    maps,
    mapGroups,
    activeMap,
    activeGroup,
    tilesets,
    activeTileset,
    activeTilesetId,
    activeTab,
    drawMode,
    selectedTileIndex,
    selectedObjectTypeId,
    selectedObjectId,
    selectedCell,
    selectedArea,
    hoveredCell,
    selectedEvent,
    selectedObject,
    events,
    gameRunning,
    gamePaused,
    canPlay,
    onSelectMap,
    onSelectGroup,
    onSelectTileset,
    onAddMap,
    onCreateGroup,
    onAddMapToGroup,
    onSelectTab,
    onSelectDrawMode,
    onSelectTile,
    onSelectObjectType,
    onCellClick,
    onCellMouseDown,
    onCellHover,
    onCellMouseUp,
    spawnPoint,
    temporaryEntryPoint,
    onCellContextMenu,
    onPlayPause,
    activeMapId,
    activeGroupId,
  } = props
  const [showGrid, setShowGrid] = useState(true)
  const [selectedGroupCell, setSelectedGroupCell] = useState<{ col: number; row: number } | null>(null)

  const isGroupMode = activeGroup != null && activeProject != null

  useEffect(() => {
    setSelectedGroupCell(null)
  }, [activeGroupId])

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: isGroupMode
          ? { xs: '1fr', lg: '300px minmax(0, 1fr) minmax(200px, 224px)' }
          : { xs: '1fr', lg: '300px 68px minmax(760px, 1fr) minmax(232px, 264px)' },
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        px: 0,
        py: 0,
        gap: 0,
        alignItems: 'stretch',
        background: tok.surface.body,
      }}
    >
      <ProjectTreePanel
        project={activeProject}
        maps={maps}
        mapGroups={mapGroups}
        activeMapId={activeMapId}
        activeGroupId={activeGroupId}
        onSelectMap={onSelectMap}
        onSelectGroup={onSelectGroup}
        onAddMap={onAddMap}
        onCreateGroup={onCreateGroup}
        onAddMapToGroup={onAddMapToGroup}
      />
      {isGroupMode ? (
        <>
          <GroupEditor
            group={activeGroup}
            maps={maps}
            tilesets={tilesets}
            selectedCell={selectedGroupCell}
            onSelectCell={(col, row) => setSelectedGroupCell({ col, row })}
          />
          <GroupDetailPanel
            group={activeGroup}
            projectId={activeProject.id}
            maps={maps}
            selectedCell={selectedGroupCell}
            onOpenMap={onSelectMap}
            onCellDeselect={() => setSelectedGroupCell(null)}
          />
        </>
      ) : (
        <>
          <ToolRail
            drawMode={drawMode}
            showGrid={showGrid}
            gameRunning={gameRunning}
            gamePaused={gamePaused}
            canPlay={canPlay}
            onSelectDrawMode={onSelectDrawMode}
            onToggleGrid={() => setShowGrid((prev) => !prev)}
            onPlayPause={onPlayPause}
          />
          <CenterEditor
            activeMap={activeMap}
            maps={maps}
            activeTileset={activeTileset}
            tilesets={tilesets}
            activeTilesetId={activeTilesetId}
            activeTab={activeTab}
            drawMode={drawMode}
            showGrid={showGrid}
            selectedTileIndex={selectedTileIndex}
            selectedObjectTypeId={selectedObjectTypeId}
            selectedObjectId={selectedObjectId}
            selectedCell={selectedCell}
            selectedArea={selectedArea}
            hoveredCell={hoveredCell}
            events={events}
            objectTypes={props.objectTypes}
            onSelectTileset={onSelectTileset}
            onSelectTab={onSelectTab}
            onSelectTile={onSelectTile}
            onSelectObjectType={onSelectObjectType}
            selectedEventTypeForPlacement={props.selectedEventTypeForPlacement}
            onSelectEventType={props.onSelectEventType}
            spawnPoint={spawnPoint}
            temporaryEntryPoint={temporaryEntryPoint}
            onCellClick={onCellClick}
            onCellMouseDown={onCellMouseDown}
            onCellHover={onCellHover}
            onCellMouseUp={onCellMouseUp}
            onCellContextMenu={onCellContextMenu}
            onSelectMap={onSelectMap}
          />
          <InspectorPanel
            activeMap={activeMap}
            tilesets={tilesets}
            activeTileset={activeTileset}
            activeTab={activeTab}
            selectedCell={selectedCell}
            selectedTileIndex={selectedTileIndex}
            selectedEvent={selectedEvent}
            selectedObject={selectedObject}
            events={events}
            objectTypes={props.objectTypes}
            onUpdateEvent={props.onUpdateEvent}
            onDeleteEvent={props.onDeleteEvent}
            onUpdateObject={props.onUpdateObject}
          />
        </>
      )}
    </Box>
  )
}
