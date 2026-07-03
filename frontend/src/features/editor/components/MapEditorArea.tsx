import { Box, Typography } from '@mui/material'
import { useEffect, useRef } from 'react'
import type { DrawMode, EditorTab, EntryPoint, GameMap, MapEvent, MapObject, ObjectType, SelectedArea, SelectedCell, SpawnPoint, TileHitbox, Tileset } from '../model/types'
import { findEventAt, findObjectAtCell, getCellDisplay, normalizeSelectedArea } from '../model/utils'
import { MAP_CELL_DISPLAY_SIZE as MAP_CELL_SIZE } from '../model/mapConstants'
import { rectangleCanvasPatternSx } from '../theme/canvasPattern'

const NEIGHBOR_PREVIEW_TILES = 3
const NEIGHBOR_PREVIEW_GAP = 16
const NEIGHBOR_PREVIEW_OPACITY = 0.34

const categoryColor = (category: string) => {
  if (category === 'item') return '#4caf50'
  if (category === 'hazard') return '#f44336'
  if (category === 'interactive') return '#ff9800'
  return '#2196f3'
}

type TileRenderSource = {
  imageUrl: string
  tileIndex?: number
  columns?: number
  tileWidth?: number
  tileHeight?: number
}

function tileRenderSource(tilesets: Tileset[], tilesetId: number | null | undefined, tileIndex: number): TileRenderSource | null {
  if (!tilesetId) return null
  const tileset = tilesets.find((candidate) => candidate.id === tilesetId)
  if (!tileset) return null
  const tile = tileset.tiles.find((candidate) => candidate.index === tileIndex)
  if (tile) return { imageUrl: tile.imageUrl }
  if (tileset.tileMap) {
    return {
      imageUrl: tileset.imageUrl,
      tileIndex,
      columns: tileset.columns,
      tileWidth: tileset.tileWidth,
      tileHeight: tileset.tileHeight,
    }
  }
  return null
}

function TileImage({ source, alt, opacity = 1, absolute = false }: { source: TileRenderSource; alt: string; opacity?: number; absolute?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (source.tileIndex == null) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !source.columns || !source.tileWidth || !source.tileHeight) return
    let cancelled = false
    const image = new Image()
    image.onload = () => {
      if (cancelled) return
      const col = source.tileIndex! % source.columns!
      const row = Math.floor(source.tileIndex! / source.columns!)
      ctx.clearRect(0, 0, MAP_CELL_SIZE, MAP_CELL_SIZE)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, col * source.tileWidth!, row * source.tileHeight!, source.tileWidth!, source.tileHeight!, 0, 0, MAP_CELL_SIZE, MAP_CELL_SIZE)
    }
    image.src = source.imageUrl
    return () => { cancelled = true }
  }, [source])

  if (source.tileIndex != null) {
    return <Box component="canvas" ref={canvasRef} width={MAP_CELL_SIZE} height={MAP_CELL_SIZE} aria-label={alt} sx={{ ...(absolute ? { position: 'absolute', inset: 0 } : null), width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', opacity }} />
  }

  return <Box component="img" src={source.imageUrl} alt={alt} draggable={false} sx={{ ...(absolute ? { position: 'absolute', inset: 0 } : null), width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated', opacity }} />
}


const findSolidObjectAtCell = (objects: MapObject[], objectTypes: ObjectType[], tilesets: Tileset[], x: number, y: number) => (
  [...objects].reverse().find((object) => {
    const objectType = objectTypes.find((candidate) => String(candidate.id) === String(object.objectTypeId))
    if (!objectType) return false
    const solid = objectIsSolid(object, objectType) || (
      object.properties.solidOverride == null &&
      composedTileSolidFallback(tilesets, objectType.tilesetId, objectType.config.visual.tileIndex)
    )
    if (!solid) return false
    const spanX = objectType.config.visual.spanX ?? objectType.spanX ?? 1
    const spanY = objectType.config.visual.spanY ?? objectType.spanY ?? 1
    return x >= object.x && x < object.x + spanX && y >= object.y && y < object.y + spanY
  }) ?? null
)

function objectIsSolid(object: MapObject, objectType: ObjectType): boolean {
  if (object.properties.interaction?.type === 'door') {
    const stateName = object.properties.currentState === 'open' ? 'open' : 'closed'
    const collision = object.properties.states?.[stateName]?.collision
    if (collision) return collision === 'solid'
    return stateName === 'closed'
  }
  return object.properties.solidOverride ?? objectType.config.defaultSolid
}

function composedTileSolidFallback(tilesets: Tileset[], tilesetId: number, tileIndex: number): boolean {
  const tileset = tilesets.find((candidate) => candidate.id === tilesetId)
  const solid = solidTileResult(tilesets, tilesetId, tileIndex)
  return Boolean(solid || tileset?.type === 'object')
}

function objectTileIndex(object: MapObject, objectType: ObjectType): number {
  if (object.properties.interaction?.type === 'door') {
    const stateName = object.properties.currentState === 'open' ? 'open' : 'closed'
    const sprite = object.properties.states?.[stateName]?.sprite
    if (sprite && Number.isFinite(sprite.tileIndex)) return sprite.tileIndex
  }
  const state = objectType.config.states?.find((candidate) => candidate.name === object.properties.currentState)
  return state?.tileIndex ?? objectType.config.visual.tileIndex
}

type SolidTileResult = { tile: { metadata?: { hitbox?: TileHitbox } } | null; tileset: Tileset | null }

function solidTileResult(tilesets: Tileset[], tilesetId: number | null | undefined, tileIndex: number): SolidTileResult | null {
  if (!tilesetId) return null
  const tileset = tilesets.find((candidate) => candidate.id === tilesetId)
  if (!tileset) return null

  const legacyTile = tileset.tiles.find((tile) => tile.index === tileIndex)
  if (legacyTile?.metadata?.solid) return { tile: legacyTile, tileset }

  if (!tileset.tileMap || Object.keys(tileset.tileMap).length === 0) return null
  const slot = `${tileIndex % Math.max(1, tileset.columns)},${Math.floor(tileIndex / Math.max(1, tileset.columns))}`
  for (const group of tileset.groups ?? []) {
    const slotIndex = (group.tiles ?? []).indexOf(slot)
    if (slotIndex < 0) continue
    const tileRef = group.tileRefs?.[slotIndex]
    const tileOverrides = (group.metadata?.tileOverrides ?? {}) as Record<string, { solid?: boolean; hitbox?: TileHitbox; collisionMask?: boolean[] }>
    const override = tileRef ? tileOverrides[String(tileRef.tileId)] : undefined
    const groupSolid = Boolean(
      group.solid ??
      group.metadata?.solid ??
      (String(group.metadata?.defaultCollision ?? 'none') === 'solid' || group.type === 'wall'),
    )
    const solid = override?.solid ?? groupSolid
    if (!solid) return null
    return { tile: { metadata: { hitbox: override?.hitbox ?? hitboxFromMask(override?.collisionMask, tileset.tileWidth, tileset.tileHeight) ?? undefined } }, tileset }
  }
  return null
}

function hitboxFromMask(mask: boolean[] | undefined, tileWidth: number, tileHeight: number): TileHitbox | null {
  if (!mask?.some(Boolean)) return null
  const maskSize = Math.sqrt(mask.length)
  if (!Number.isInteger(maskSize) || maskSize <= 0) return null
  let minX = maskSize
  let minY = maskSize
  let maxX = -1
  let maxY = -1
  mask.forEach((solid, index) => {
    if (!solid) return
    const x = index % maskSize
    const y = Math.floor(index / maskSize)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })
  if (maxX < minX || maxY < minY) return null
  const cellW = tileWidth / maskSize
  const cellH = tileHeight / maskSize
  return {
    offsetX: Math.floor(minX * cellW),
    offsetY: Math.floor(minY * cellH),
    width: Math.ceil((maxX - minX + 1) * cellW),
    height: Math.ceil((maxY - minY + 1) * cellH),
  }
}

type MapEditorAreaProps = {
  activeMap: GameMap | null
  maps: GameMap[]
  tilesets: Tileset[]
  activeTab: EditorTab
  drawMode: DrawMode
  showGrid: boolean
  selectedCell: SelectedCell | null
  selectedArea: SelectedArea | null
  selectedObjectId: string | null
  hoveredCell: SelectedCell | null
  events: MapEvent[]
  objectTypes: ObjectType[]
  spawnPoint: SpawnPoint | null
  temporaryEntryPoint: EntryPoint | null
  onCellClick: (x: number, y: number) => void
  onCellMouseDown: (x: number, y: number) => void
  onCellHover: (x: number, y: number) => void
  onCellMouseUp: (x: number, y: number) => void
  onCellContextMenu: (mouseX: number, mouseY: number, cellX: number, cellY: number) => void
  onSelectMap?: (mapId: number) => void
}

export function MapEditorArea({
  activeMap,
  maps,
  tilesets,
  activeTab,
  drawMode,
  showGrid,
  selectedCell,
  selectedArea,
  selectedObjectId,
  hoveredCell,
  events,
  objectTypes,
  spawnPoint,
  temporaryEntryPoint,
  onCellClick,
  onCellMouseDown,
  onCellHover,
  onCellMouseUp,
  onCellContextMenu,
  onSelectMap,
}: MapEditorAreaProps) {
  if (!activeMap) {
    return (
      <Box
        sx={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            ...rectangleCanvasPatternSx,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
            textAlign: 'center',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
              Select or create a map
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              The editor canvas will appear here once a map is loaded.
            </Typography>
          </Box>
        </Box>
      </Box>
    )
  }

  const mapCols = activeMap.width
  const mapRows = activeMap.height
  const previewSizePx = NEIGHBOR_PREVIEW_TILES * MAP_CELL_SIZE
  const centerWidth = mapCols * MAP_CELL_SIZE
  const centerHeight = mapRows * MAP_CELL_SIZE
  const neighborMaps = findNeighborMaps(activeMap, maps)
  const normalizedArea = selectedArea ? normalizeSelectedArea(selectedArea) : null
  const backgroundOpacity = activeTab === 'background' ? 1 : 0.34
  const objectOpacity = activeTab === 'objects' ? 1 : activeTab === 'background' ? 0.62 : 0.28
  const hoveredObject = hoveredCell ? findObjectAtCell(activeMap.objects ?? [], objectTypes, hoveredCell.x, hoveredCell.y) : null
  const selectedMapObject = selectedObjectId ? (activeMap.objects ?? []).find((o) => o.id === selectedObjectId) ?? null : null
  const wiredObjectIds = new Set<string>()
  if (selectedMapObject?.properties.emitter?.triggerId) {
    const id = selectedMapObject.properties.emitter.triggerId
    ;(activeMap.objects ?? []).forEach((o) => { if (o.id !== selectedObjectId && o.properties.listener?.triggerId === id) wiredObjectIds.add(o.id) })
  }
  if (selectedMapObject?.properties.listener?.triggerId) {
    const id = selectedMapObject.properties.listener.triggerId
    ;(activeMap.objects ?? []).forEach((o) => { if (o.id !== selectedObjectId && o.properties.emitter?.triggerId === id) wiredObjectIds.add(o.id) })
  }

  return (
    <Box sx={{ flex: 1, width: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          ...rectangleCanvasPatternSx,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          const cell = (event.target as HTMLElement).closest('[data-cx]') as HTMLElement | null
          if (cell) onCellContextMenu(event.clientX, event.clientY, Number(cell.dataset.cx), Number(cell.dataset.cy))
        }}
        onDragStart={(event) => event.preventDefault()}
      >
        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3, minWidth: 'max-content', minHeight: 'max-content' }}>
          <Box sx={{ position: 'relative', width: centerWidth, height: centerHeight, flexShrink: 0, overflow: 'visible' }}>
            {neighborMaps.west ? (
              <NeighborMapPreview map={neighborMaps.west} tilesets={tilesets} side="west" sx={{ left: -(previewSizePx + NEIGHBOR_PREVIEW_GAP), top: 0, width: previewSizePx, height: centerHeight }} onSelectMap={onSelectMap} />
            ) : null}
            {neighborMaps.east ? (
              <NeighborMapPreview map={neighborMaps.east} tilesets={tilesets} side="east" sx={{ left: centerWidth + NEIGHBOR_PREVIEW_GAP, top: 0, width: previewSizePx, height: centerHeight }} onSelectMap={onSelectMap} />
            ) : null}
            {neighborMaps.north ? (
              <NeighborMapPreview map={neighborMaps.north} tilesets={tilesets} side="north" sx={{ left: 0, top: -(previewSizePx + NEIGHBOR_PREVIEW_GAP), width: centerWidth, height: previewSizePx }} onSelectMap={onSelectMap} />
            ) : null}
            {neighborMaps.south ? (
              <NeighborMapPreview map={neighborMaps.south} tilesets={tilesets} side="south" sx={{ left: 0, top: centerHeight + NEIGHBOR_PREVIEW_GAP, width: centerWidth, height: previewSizePx }} onSelectMap={onSelectMap} />
            ) : null}

            <Box sx={{ position: 'absolute', left: 0, top: 0, display: 'inline-flex', flexDirection: 'column' }}>
            {Array.from({ length: mapRows }).map((_, y) => (
              <Box key={y} sx={{ display: 'flex' }}>
                {Array.from({ length: mapCols }).map((_, x) => {
                const display = getCellDisplay(activeMap, x, y, events)
                const topTile = display.background
                const eventAtCell = findEventAt(events, x, y)
                const tileSource = topTile ? tileRenderSource(tilesets, topTile.tilesetId, topTile.tileIndex) : null
                const objectLayerTile = display.object
                const objectLayerSource = objectLayerTile ? tileRenderSource(tilesets, objectLayerTile.tilesetId, objectLayerTile.tileIndex) : null
                const showCollisionOverlay = activeTab === 'collision'
                const solidObject = showCollisionOverlay ? findSolidObjectAtCell(activeMap.objects ?? [], objectTypes, tilesets, x, y) : null
                const solidResult = showCollisionOverlay
                  ? (() => {
                      if (solidObject) {
                        return { tile: null, tileset: null }
                      }
                      if (display.collision) {
                        return { tile: null, tileset: null }
                      }
                      for (const cell of [display.background, display.foreground]) {
                        if (!cell?.tilesetId) continue
                        const solidTile = solidTileResult(tilesets, cell.tilesetId, cell.tileIndex)
                        if (solidTile) return solidTile
                      }
                      return null
                    })()
                  : null
                const isSelected = selectedCell?.x === x && selectedCell?.y === y
                const isHovered = hoveredCell?.x === x && hoveredCell?.y === y
                const isAreaSelected = normalizedArea
                  ? x >= normalizedArea.minX && x <= normalizedArea.maxX && y >= normalizedArea.minY && y <= normalizedArea.maxY
                  : false
                const isSpawn = spawnPoint?.x === x && spawnPoint?.y === y
                const isTempEntry = temporaryEntryPoint?.x === x && temporaryEntryPoint?.y === y
                const objectsAtCell = (activeMap.objects ?? []).filter((object) => object.x === x && object.y === y)
                const objectAtCell = findObjectAtCell(activeMap.objects ?? [], objectTypes, x, y)
                const showCellHover =
                  isHovered &&
                  (activeTab === 'background' ||
                    activeTab === 'collision' ||
                    (activeTab === 'objects' && Boolean(objectAtCell)) ||
                    (activeTab === 'events' && Boolean(eventAtCell)))

                  return (
                    <Box
                      key={x}
                      onClick={(event) => {
                        if (event.button !== 0 || event.ctrlKey) return
                        onCellClick(x, y)
                      }}
                      onMouseDown={(event) => {
                        if (event.button !== 0) return
                        onCellMouseDown(x, y)
                      }}
                      onMouseEnter={() => onCellHover(x, y)}
                      onMouseUp={(event) => {
                        if (event.button !== 0) return
                        onCellMouseUp(x, y)
                      }}
                      onDragStart={(event) => event.preventDefault()}
                      data-cx={x}
                      data-cy={y}
                      sx={{
                        width: MAP_CELL_SIZE,
                        height: MAP_CELL_SIZE,
                        bgcolor: '#101820',
                        borderRight: showGrid ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                        borderBottom: showGrid ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                        cursor: drawMode === 'select' ? 'default' : 'crosshair',
                        position: 'relative',
                        flexShrink: 0,
                        outline: isSelected
                          ? '2.5px solid rgba(55,138,221,0.9)'
                          : isAreaSelected
                            ? '2px solid rgba(55,138,221,0.72)'
                            : showCellHover
                              ? '1px solid rgba(55,138,221,0.4)'
                              : 'none',
                        outlineOffset: '-2px',
                        zIndex: isSelected ? 2 : 'auto',
                        boxShadow: isAreaSelected ? 'inset 0 0 0 999px rgba(55,138,221,0.14)' : 'none',
                        '&:hover': { filter: drawMode === 'single' ? 'brightness(1.12)' : 'none' },
                      }}
                    >
                    {tileSource ? (
                      <TileImage source={tileSource} alt={`cell-${x}-${y}`} opacity={backgroundOpacity} />
                    ) : null}
                    {objectLayerSource ? (
                      <TileImage source={objectLayerSource} alt={`obj-${x}-${y}`} opacity={objectOpacity} absolute />
                    ) : null}
                    {objectsAtCell.map((object) => {
                      const objectType = objectTypes.find((candidate) => String(candidate.id) === String(object.objectTypeId))
                      if (!objectType) return null
                      const tileIndex = objectTileIndex(object, objectType)
                      const objectSource = tileRenderSource(tilesets, objectType.tilesetId, tileIndex)
                      const spanX = objectType.config.visual.spanX ?? objectType.spanX ?? 1
                      const spanY = objectType.config.visual.spanY ?? objectType.spanY ?? 1
                      const selected = selectedObjectId === object.id
                      const hovered = hoveredObject?.id === object.id
                      return objectSource ? (
                        <Box key={object.id} sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: objectOpacity }}>
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              width: MAP_CELL_SIZE * spanX,
                              height: MAP_CELL_SIZE * spanY,
                            }}
                          >
                            <TileImage source={objectSource} alt={objectType.name} />
                          </Box>
                          {activeTab === 'objects' ? (
                            <Box sx={{ position: 'absolute', top: 3, left: 3, width: 7, height: 7, borderRadius: '50%', bgcolor: categoryColor(objectType.category), boxShadow: '0 0 0 1px rgba(0,0,0,0.5)' }} />
                          ) : null}
                          {activeTab === 'objects' || selected ? (
                            <Box sx={{ position: 'absolute', inset: 0, width: MAP_CELL_SIZE * spanX, height: MAP_CELL_SIZE * spanY, border: selected ? '2px solid #388bfd' : wiredObjectIds.has(object.id) ? '2px solid #e8a832' : hovered ? '1px solid rgba(56,139,253,0.6)' : '1px solid rgba(56,139,253,0.28)', pointerEvents: 'none' }} />
                          ) : null}
                        </Box>
                      ) : null
                    })}
                    {solidResult ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          ...(solidResult.tile?.metadata?.hitbox && solidResult.tileset ? {
                            left: `${(solidResult.tile.metadata.hitbox.offsetX / solidResult.tileset.tileWidth) * 100}%`,
                            top: `${(solidResult.tile.metadata.hitbox.offsetY / solidResult.tileset.tileHeight) * 100}%`,
                            width: `${(solidResult.tile.metadata.hitbox.width / solidResult.tileset.tileWidth) * 100}%`,
                            height: `${(solidResult.tile.metadata.hitbox.height / solidResult.tileset.tileHeight) * 100}%`,
                          } : { inset: 0 }),
                          bgcolor: 'rgba(220,50,50,0.46)',
                          border: '1px solid rgba(255,92,92,0.62)',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : null}
                      {activeTab === 'events' && eventAtCell ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 4,
                          border: '2px solid rgba(239,159,39,0.88)',
                          bgcolor: 'rgba(239,159,39,0.16)',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : null}
                    {isSpawn ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          left: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '3px',
                          bgcolor: '#4caf50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#fff',
                          pointerEvents: 'none',
                          lineHeight: 1,
                        }}
                      >
                        S
                      </Box>
                    ) : null}
                    {isTempEntry ? (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 14,
                          height: 14,
                          borderRadius: '3px',
                            bgcolor: '#EF9F27',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#fff',
                          pointerEvents: 'none',
                          lineHeight: 1,
                        }}
                      >
                        T
                      </Box>
                    ) : null}
                    </Box>
                  )
                })}
              </Box>
            ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

function findNeighborMaps(activeMap: GameMap, maps: GameMap[]) {
  if (activeMap.mapGroupId == null || activeMap.gridCol == null || activeMap.gridRow == null) {
    return {}
  }
  const inSameGroup = maps.filter((map) => map.mapGroupId === activeMap.mapGroupId)
  const at = (col: number, row: number) => inSameGroup.find((map) => map.gridCol === col && map.gridRow === row) ?? null
  return {
    west: at(activeMap.gridCol - 1, activeMap.gridRow),
    east: at(activeMap.gridCol + 1, activeMap.gridRow),
    north: at(activeMap.gridCol, activeMap.gridRow - 1),
    south: at(activeMap.gridCol, activeMap.gridRow + 1),
  }
}

function NeighborMapPreview({
  map,
  tilesets,
  side,
  sx,
  onSelectMap,
}: {
  map: GameMap
  tilesets: Tileset[]
  side: 'west' | 'east' | 'north' | 'south'
  sx: Record<string, number>
  onSelectMap?: (mapId: number) => void
}) {
  const startX = side === 'west' ? Math.max(0, map.width - NEIGHBOR_PREVIEW_TILES) : 0
  const endX = side === 'east' ? Math.min(map.width, NEIGHBOR_PREVIEW_TILES) : side === 'west' ? map.width : map.width
  const startY = side === 'north' ? Math.max(0, map.height - NEIGHBOR_PREVIEW_TILES) : 0
  const endY = side === 'south' ? Math.min(map.height, NEIGHBOR_PREVIEW_TILES) : side === 'north' ? map.height : map.height
  const cols = Array.from({ length: Math.max(0, endX - startX) }, (_, index) => startX + index)
  const rows = Array.from({ length: Math.max(0, endY - startY) }, (_, index) => startY + index)

  return (
    <Box
      onClick={() => onSelectMap?.(map.id)}
      sx={{
        position: 'absolute',
        overflow: 'hidden',
        opacity: NEIGHBOR_PREVIEW_OPACITY,
        filter: 'saturate(0.72)',
        pointerEvents: onSelectMap ? 'auto' : 'none',
        cursor: onSelectMap ? 'pointer' : 'default',
        maskImage: side === 'west'
          ? 'linear-gradient(90deg, transparent 0%, black 42%, black 100%)'
          : side === 'east'
            ? 'linear-gradient(90deg, black 0%, black 58%, transparent 100%)'
            : side === 'north'
              ? 'linear-gradient(180deg, transparent 0%, black 42%, black 100%)'
              : 'linear-gradient(180deg, black 0%, black 58%, transparent 100%)',
        WebkitMaskImage: side === 'west'
          ? 'linear-gradient(90deg, transparent 0%, black 42%, black 100%)'
          : side === 'east'
            ? 'linear-gradient(90deg, black 0%, black 58%, transparent 100%)'
            : side === 'north'
              ? 'linear-gradient(180deg, transparent 0%, black 42%, black 100%)'
              : 'linear-gradient(180deg, black 0%, black 58%, transparent 100%)',
        ...sx,
      }}
    >
      <Box sx={{ display: 'inline-flex', flexDirection: 'column' }}>
        {rows.map((y) => (
          <Box key={y} sx={{ display: 'flex' }}>
            {cols.map((x) => {
              const display = getCellDisplay(map, x, y, [])
              const source = display.background ? tileRenderSource(tilesets, display.background.tilesetId, display.background.tileIndex) : null
              return (
                <Box key={`${x}-${y}`} sx={{ width: MAP_CELL_SIZE, height: MAP_CELL_SIZE, bgcolor: '#101820', flexShrink: 0 }}>
                  {source ? <TileImage source={source} alt={`${map.name}-${x}-${y}`} opacity={1} /> : null}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
