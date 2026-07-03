import { Box, MenuItem, Select, Tab, Tabs, Typography } from '@mui/material'
import { editorTokens as tok } from '../../../app/theme'
import { useEffect, useMemo, useRef } from 'react'
import type { DrawMode, EditorTab, EntryPoint, EventType, GameMap, MapEvent, ObjectType, SelectedArea, SelectedCell, SpawnPoint, Tileset } from '../model/types'
import { MapEditorArea } from './MapEditorArea'
import { isObjectGroup, objectTypeForTile } from '../model/utils'

const submenuHeight = 160
const tileSize = 42

type CenterEditorProps = {
  activeMap: GameMap | null
  maps: GameMap[]
  activeTileset: Tileset | null
  tilesets: Tileset[]
  activeTilesetId: number | null
  activeTab: EditorTab
  drawMode: DrawMode
  showGrid: boolean
  selectedTileIndex: number | null
  selectedObjectTypeId: string | null
  selectedObjectId: string | null
  selectedCell: SelectedCell | null
  selectedArea: SelectedArea | null
  hoveredCell: SelectedCell | null
  events: MapEvent[]
  objectTypes: ObjectType[]
  selectedEventTypeForPlacement: EventType | null
  spawnPoint: SpawnPoint | null
  temporaryEntryPoint: EntryPoint | null
  onSelectTileset: (tilesetId: number | null) => void
  onSelectTab: (tab: EditorTab) => void
  onSelectTile: (tileIndex: number | null) => void
  onSelectObjectType: (objectTypeId: string | null) => void
  onSelectEventType: (eventType: EventType | null) => void
  onCellClick: (x: number, y: number) => void
  onCellMouseDown: (x: number, y: number) => void
  onCellHover: (x: number, y: number) => void
  onCellMouseUp: (x: number, y: number) => void
  onCellContextMenu: (mouseX: number, mouseY: number, cellX: number, cellY: number) => void
  onSelectMap?: (mapId: number) => void
}

export function CenterEditor(props: CenterEditorProps) {
  const backgroundTilesets = useMemo(
    () => props.tilesets.filter((tileset) => tileset.assetType === 'environment' && tilesetMode(tileset) === 'background'),
    [props.tilesets],
  )
  const objectTilesets = useMemo(
    () => props.tilesets.filter((tileset) => tileset.assetType === 'environment' && tilesetMode(tileset) === 'object'),
    [props.tilesets],
  )
  const tilesetOptions = props.activeTab === 'background'
    ? backgroundTilesets
    : props.activeTab === 'objects'
      ? objectTilesets
      : []
  const showTilesetSelector = props.activeTab === 'background' || props.activeTab === 'objects'

  useEffect(() => {
    if (!showTilesetSelector) return
    if (tilesetOptions.some((tileset) => tileset.id === props.activeTilesetId)) return
    props.onSelectTileset(tilesetOptions[0]?.id ?? null)
  }, [props.activeTilesetId, props.onSelectTileset, showTilesetSelector, tilesetOptions])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%', height: '100%', minWidth: 0, minHeight: 0, background: tok.surface.canvas }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: tok.surface.canvas,
          minHeight: 36,
          px: 0,
        }}
      >
        <Tabs
          value={props.activeTab}
          onChange={(_event, value) => props.onSelectTab(value)}
          variant="standard"
          sx={{
            minHeight: 36,
            flexShrink: 0,
            '& .MuiTab-root': {
              minHeight: 36,
              fontFamily: 'monospace',
              fontSize: 12,
              textTransform: 'none',
              color: '#8f9baa',
            },
            '& .Mui-selected': { color: '#4d9cff' },
            '& .MuiTabs-indicator': { height: 2, bgcolor: '#4d9cff' },
          }}
        >
          <Tab value="background" label="Background" />
          <Tab value="objects" label="Objects" />
          <Tab value="events" label="Events" />
          <Tab value="collision" label="Collision" />
        </Tabs>
        {showTilesetSelector ? (
          <InlineTilesetSelector
            value={props.activeTilesetId}
            tilesets={tilesetOptions}
            onChange={props.onSelectTileset}
          />
        ) : null}
      </Box>

      <ModeSubmenu {...props} />

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: tok.surface.deep, overflow: 'hidden' }}>
        <MapEditorArea
          activeMap={props.activeMap}
          maps={props.maps}
          tilesets={props.tilesets}
          activeTab={props.activeTab}
          drawMode={props.drawMode}
          showGrid={props.showGrid}
          selectedCell={props.selectedCell}
          selectedArea={props.selectedArea}
          selectedObjectId={props.selectedObjectId}
          hoveredCell={props.hoveredCell}
          events={props.events}
          objectTypes={props.objectTypes}
          spawnPoint={props.spawnPoint}
          temporaryEntryPoint={props.temporaryEntryPoint}
          onCellClick={props.onCellClick}
          onCellMouseDown={props.onCellMouseDown}
          onCellHover={props.onCellHover}
          onCellMouseUp={props.onCellMouseUp}
          onCellContextMenu={props.onCellContextMenu}
          onSelectMap={props.onSelectMap}
        />
      </Box>
    </Box>
  )
}

function ModeSubmenu(props: CenterEditorProps) {
  return (
    <Box
      sx={{
        height: submenuHeight,
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: tok.surface.canvas,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {props.activeTab === 'background' ? <BackgroundSubmenu {...props} /> : null}
      {props.activeTab === 'objects' ? <ObjectsSubmenu {...props} /> : null}
      {props.activeTab === 'events' ? <EventsSubmenu {...props} /> : null}
      {props.activeTab === 'collision' ? (
        <Box sx={{ px: 1.5, py: 1, display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>Click to mark solid · Right-click to clear</Typography>
        </Box>
      ) : null}
    </Box>
  )
}

function InlineTilesetSelector({
  value,
  tilesets,
  onChange,
}: {
  value: number | null
  tilesets: Tileset[]
  onChange: (tilesetId: number | null) => void
}) {
  return (
    <Select
      value={value ?? ''}
      onChange={(event) => onChange(Number(event.target.value) || null)}
      size="small"
      variant="standard"
      disableUnderline
      displayEmpty
      sx={{
        ml: 'auto',
        mr: 1.25,
        maxWidth: { xs: 120, sm: 180, md: 240 },
        minWidth: 0,
        flexShrink: 1,
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#d6dee8',
        '& .MuiSelect-select': {
          py: 0,
          pl: 1,
          pr: '22px !important',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
        '& .MuiSvgIcon-root': { fontSize: 16, color: '#8f9baa', opacity: 0.75 },
      }}
    >
      <MenuItem value="">No tileset</MenuItem>
      {tilesets.map((tileset) => (
        <MenuItem key={tileset.id} value={tileset.id} sx={{ fontSize: 12, fontFamily: 'monospace' }}>
          {tileset.name}
        </MenuItem>
      ))}
    </Select>
  )
}

function tilesetMode(tileset: Tileset): 'background' | 'object' {
  return (tileset.type ?? tileset.metadata?.type) === 'object' ? 'object' : 'background'
}

function sortGroups(groups: Tileset['groups']) {
  return [...groups].sort((left, right) => Number(left.orderIndex ?? 0) - Number(right.orderIndex ?? 0))
}

function BackgroundSubmenu({ activeTileset, selectedTileIndex, onSelectTile }: CenterEditorProps) {
  if (activeTileset?.tileMap && Object.keys(activeTileset.tileMap).length > 0) {
    const terrainGroups = sortGroups(activeTileset.groups.filter((group) => !isObjectGroup(group)))
    return (
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.5 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
          {terrainGroups.map((group) => (
            <ComposedTileGroupGrid
              key={String(group.id)}
              group={group}
              tileset={activeTileset}
              selectedTileIndex={selectedTileIndex}
              onSelectTile={onSelectTile}
            />
          ))}
        </Box>
      </Box>
    )
  }
  const realTiles = activeTileset?.tiles ?? []
  const tileByExtractedId = new Map(realTiles.map((tile) => [tile.extractedTileId, tile]))
  const terrainGroups = sortGroups(activeTileset?.groups.filter((group) => !isObjectGroup(group)) ?? [])
  const groupedExtractedIds = new Set(terrainGroups.flatMap((group) => (group.tileRefs ?? []).map((ref) => ref.tileId)))
  const objectExtractedIds = new Set(activeTileset?.groups.filter(isObjectGroup).flatMap((group) => (group.tileRefs ?? []).map((ref) => ref.tileId)) ?? [])
  const unassignedTiles = realTiles.filter((tile) => !groupedExtractedIds.has(tile.extractedTileId) && !objectExtractedIds.has(tile.extractedTileId))
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.5 }}>
        {terrainGroups.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
            {terrainGroups.map((group) => (
              <TileGroupGrid
                key={group.id}
                group={group}
                tileByExtractedId={tileByExtractedId}
                selectedTileIndex={selectedTileIndex}
                onSelectTile={onSelectTile}
              />
            ))}
          </Box>
        ) : null}
        {unassignedTiles.length > 0 ? (
          <Box>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', letterSpacing: '0.04em', px: 0.5, pt: 0.75, pb: 0.25, display: 'block' }}>
              Unassigned
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '2px', mb: 0.5 }}>
              {unassignedTiles.map((tile) => (
                <TileThumbnail
                  key={tile.index}
                  imageUrl={tile.imageUrl}
                  selected={selectedTileIndex === tile.index}
                  size={tileSize}
                  onClick={() => onSelectTile(tile.index)}
                />
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
  )
}

function TileGroupGrid({
  group,
  tileByExtractedId,
  selectedTileIndex,
  onSelectTile,
}: {
  group: Tileset['groups'][number]
  tileByExtractedId: Map<number, Tileset['tiles'][number]>
  selectedTileIndex: number | null
  onSelectTile: (tileIndex: number | null) => void
}) {
  const width = Math.max(
    1,
    Number(group.metadata?.width ?? group.metadata?.cols ?? group.metadata?.columns ?? 1),
    ...(group.tileRefs ?? []).map((ref) => ref.x + 1),
  )
  const height = Math.max(
    1,
    Number(group.metadata?.height ?? group.metadata?.rows ?? 1),
    ...(group.tileRefs ?? []).map((ref) => ref.y + 1),
  )
  const cells = Array.from({ length: width * height }, (_, index) => {
    const x = index % width
    const y = Math.floor(index / width)
    const ref = (group.tileRefs ?? []).find((tileRef) => tileRef.x === x && tileRef.y === y) ?? null
    return ref ? tileByExtractedId.get(ref.tileId) ?? null : null
  })

  return (
    <Box sx={{ flex: '0 0 auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${width}, ${tileSize}px)`, gap: '2px' }}>
        {cells.map((tile, index) => (
          tile ? (
              <TileThumbnail
                key={`${group.id}-${tile.index}`}
                imageUrl={tile.imageUrl}
                selected={selectedTileIndex === tile.index}
                size={tileSize}
                padding={4}
                onClick={() => onSelectTile(tile.index)}
              />
          ) : (
            <Box
              key={`${group.id}-empty-${index}`}
              sx={{
                width: tileSize,
                height: tileSize,
                outline: '1px solid rgba(255,255,255,0.025)',
                outlineOffset: '-1px',
                bgcolor: 'rgba(255,255,255,0.01)',
                p: '4px',
              }}
            />
          )
        ))}
      </Box>
    </Box>
  )
}

function ComposedTileGroupGrid({
  group,
  tileset,
  selectedTileIndex,
  onSelectTile,
}: {
  group: Tileset['groups'][number]
  tileset: Tileset
  selectedTileIndex: number | null
  onSelectTile: (tileIndex: number | null) => void
}) {
  const tileRefs = group.tileRefs ?? []
  const width = Math.max(
    1,
    Number(group.metadata?.width ?? group.metadata?.cols ?? group.metadata?.columns ?? 1),
    ...tileRefs.map((ref) => ref.x + 1),
  )
  const slots = group.tiles ?? []
  const height = Math.max(
    1,
    Number(group.metadata?.height ?? group.metadata?.rows ?? 1),
    ...tileRefs.map((ref) => ref.y + 1),
    Math.ceil(slots.length / width),
  )
  const cells = Array.from({ length: width * height }, (_, index) => {
    if (tileRefs.length === 0) return slots[index] ?? null
    const x = index % width
    const y = Math.floor(index / width)
    const refIndex = tileRefs.findIndex((ref) => ref.x === x && ref.y === y)
    return refIndex >= 0 ? slots[refIndex] ?? null : null
  })

  return (
    <Box sx={{ flex: '0 0 auto' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${width}, ${tileSize}px)`, gap: '2px' }}>
        {cells.map((slot, index) => {
          if (!slot) {
            return (
              <Box
                key={`${group.id}-empty-${index}`}
                sx={{
                  width: tileSize,
                  height: tileSize,
                  outline: '1px solid rgba(255,255,255,0.025)',
                  outlineOffset: '-1px',
                  bgcolor: 'rgba(255,255,255,0.01)',
                  p: '4px',
                }}
              />
            )
          }
          const [col, row] = slot.split(',').map(Number)
          const tileIndex = row * tileset.columns + col
          return (
            <ComposedTileThumbnail
              key={`${group.id}-${slot}-${index}`}
              imageUrl={tileset.imageUrl}
              col={col}
              row={row}
              tileWidth={tileset.tileWidth}
              tileHeight={tileset.tileHeight}
              selected={selectedTileIndex === tileIndex}
              size={tileSize}
              onClick={() => onSelectTile(tileIndex)}
            />
          )
        })}
      </Box>
    </Box>
  )
}

function TileThumbnail({ imageUrl, selected, size, padding = 0, onClick }: { imageUrl: string; selected: boolean; size: number; padding?: number; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, size, size)
    }
    image.src = imageUrl
  }, [imageUrl, size])

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      width={size}
      height={size}
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        p: `${padding}px`,
        imageRendering: 'pixelated',
        cursor: 'pointer',
        outline: selected ? '2px solid #388bfd' : '1px solid rgba(255,255,255,0.06)',
        outlineOffset: selected ? '-2px' : '-1px',
        bgcolor: 'rgba(255,255,255,0.025)',
        boxSizing: 'border-box',
      }}
    />
  )
}

function ComposedTileThumbnail({
  imageUrl,
  col,
  row,
  tileWidth,
  tileHeight,
  selected,
  size,
  onClick,
}: {
  imageUrl: string
  col: number
  row: number
  tileWidth: number
  tileHeight: number
  selected: boolean
  size: number
  onClick: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, col * tileWidth, row * tileHeight, tileWidth, tileHeight, 0, 0, size, size)
    }
    image.src = imageUrl
  }, [col, imageUrl, row, size, tileHeight, tileWidth])

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      width={size}
      height={size}
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        cursor: 'pointer',
        imageRendering: 'pixelated',
        outline: selected ? '2px solid #388bfd' : '1px solid rgba(255,255,255,0.06)',
        outlineOffset: selected ? '-2px' : '-1px',
        bgcolor: 'rgba(255,255,255,0.025)',
      }}
    />
  )
}

function ObjectsSubmenu({ activeTileset, selectedTileIndex, selectedObjectTypeId, objectTypes, onSelectTile, onSelectObjectType }: CenterEditorProps) {
  const activeTilesetIsObject = activeTileset ? tilesetMode(activeTileset) === 'object' : false
  if (activeTileset?.tileMap && Object.keys(activeTileset.tileMap).length > 0) {
    const objectGroups = sortGroups(activeTilesetIsObject ? activeTileset.groups : activeTileset.groups.filter(isObjectGroup))
    const selectedObjectType = objectTypes.find((objectType) => String(objectType.id) === String(selectedObjectTypeId))
    const selectedObjectTileIndex = selectedTileIndex ?? selectedObjectType?.config.visual.tileIndex ?? null
    return (
      <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.75 }}>
        {objectGroups.length > 0 ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1, mb: 0 }}>
            {objectGroups.map((group) => (
              <ComposedTileGroupGrid
                key={String(group.id)}
                group={group}
                tileset={activeTileset}
                selectedTileIndex={selectedObjectTileIndex}
                onSelectTile={(tileIndex) => {
                  if (tileIndex == null) return
                  const objectType = objectTypeForTile(objectTypes, activeTileset.id, tileIndex)
                  if (objectType) {
                    onSelectObjectType(objectType.id)
                  } else {
                    onSelectObjectType(null)
                    onSelectTile(tileIndex)
                  }
                }}
              />
            ))}
          </Box>
        ) : null}
      </Box>
    )
  }
  const realTiles = activeTileset?.tiles ?? []
  const tileByExtractedId = new Map(realTiles.map((tile) => [tile.extractedTileId, tile]))
  const objectGroups = sortGroups(activeTilesetIsObject ? activeTileset?.groups ?? [] : activeTileset?.groups.filter(isObjectGroup) ?? [])
  const objectTileIds = new Set(objectGroups.flatMap((group) => (group.tileRefs ?? []).map((ref) => ref.tileId)))
  const objectGroupTileIndices = new Set(
    objectGroups.flatMap((group) =>
      (group.tileRefs ?? [])
        .map((ref) => tileByExtractedId.get(ref.tileId)?.index)
        .filter((index): index is number => index != null),
    ),
  )
  const ungroupedObjectTiles = realTiles.filter(
    (tile) => !objectTileIds.has(tile.extractedTileId) && !objectGroupTileIndices.has(tile.index) && String(tile.metadata.tileType ?? '') === 'object',
  )
  const objectTypeTiles = objectTypes
    .filter((objectType) => activeTileset && objectType.tilesetId === activeTileset.id)
    .map((objectType) => realTiles.find((tile) => tile.index === objectType.config.visual.tileIndex))
    .filter((tile): tile is Tileset['tiles'][number] => Boolean(tile))
    .filter((tile, index, tiles) => (
      !objectTileIds.has(tile.extractedTileId) &&
      !objectGroupTileIndices.has(tile.index) &&
      String(tile.metadata.tileType ?? '') !== 'object' &&
      tiles.findIndex((candidate) => candidate.index === tile.index) === index
    ))
  const fallbackObjectTiles = objectGroups.length > 0
    ? []
    : [...(activeTilesetIsObject ? realTiles : ungroupedObjectTiles), ...objectTypeTiles].filter((tile, index, tiles) => (
        tiles.findIndex((candidate) => candidate.index === tile.index) === index
      ))
  const selectedObjectType = objectTypes.find((objectType) => String(objectType.id) === String(selectedObjectTypeId))
  const selectedObjectTileIndex = selectedTileIndex ?? selectedObjectType?.config.visual.tileIndex ?? null

  return (
    <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', px: 1, py: 0.75 }}>
      {objectGroups.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1, mb: 0 }}>
          {objectGroups.map((group) => (
            <TileGroupGrid
              key={group.id}
              group={group}
              tileByExtractedId={tileByExtractedId}
              selectedTileIndex={selectedObjectTileIndex}
              onSelectTile={(tileIndex) => {
                if (tileIndex == null) return
                const objectType = objectTypeForTile(objectTypes, activeTileset?.id, tileIndex)
                if (objectType) {
                  onSelectObjectType(objectType.id)
                } else {
                  onSelectObjectType(null)
                  onSelectTile(tileIndex)
                }
              }}
            />
          ))}
        </Box>
      ) : null}
      {fallbackObjectTiles.length > 0 ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0, mb: 0 }}>
          {fallbackObjectTiles.map((tile) => (
            <TileThumbnail
              key={`object-${tile.index}`}
              imageUrl={tile.imageUrl}
              selected={selectedTileIndex === tile.index || objectTypes.some((objectType) => String(objectType.id) === String(selectedObjectTypeId) && objectType.config.visual.tileIndex === tile.index)}
              size={tileSize}
              padding={4}
              onClick={() => {
                const objectType = objectTypeForTile(objectTypes, activeTileset?.id, tile.index)
                if (objectType) {
                  onSelectObjectType(objectType.id)
                } else {
                  onSelectObjectType(null)
                  onSelectTile(tile.index)
                }
              }}
            />
          ))}
        </Box>
      ) : null}
      {objectGroups.length === 0 && fallbackObjectTiles.length === 0 ? (
        <Typography sx={{ px: 0.5, py: 1, fontSize: 11, color: 'text.disabled' }}>No object tiles</Typography>
      ) : null}
    </Box>
  )
}

function EventsSubmenu({ selectedEventTypeForPlacement, onSelectEventType }: CenterEditorProps) {
  const events: Array<{ type: EventType; label: string }> = [
    { type: 'warp', label: 'Warp' },
    { type: 'trigger', label: 'Trigger' },
    { type: 'door', label: 'Door' },
    { type: 'item', label: 'Item' },
    { type: 'checkpoint', label: 'Checkpoint' },
    { type: 'npc', label: 'NPC' },
    { type: 'custom', label: 'Custom' },
  ]
  return (
    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', gap: 1, px: 1.5 }}>
      {events.map((event) => {
        const selected = event.type === selectedEventTypeForPlacement
        return (
        <Box key={event.type} onClick={() => onSelectEventType(event.type)} sx={{ px: 1.25, py: 0.65, borderRadius: 1, cursor: 'pointer', fontSize: 12, color: selected ? '#d6dee8' : '#8f9baa', bgcolor: selected ? 'rgba(77,156,255,0.14)' : 'transparent', border: '1px solid', borderColor: selected ? 'rgba(77,156,255,0.45)' : 'rgba(255,255,255,0.07)' }}>
            {event.label}
          </Box>
        )
      })}
    </Box>
  )
}
