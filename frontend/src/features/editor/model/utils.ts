import type { GameMap, LayerType, MapEvent, MapLayer, MapObject, ObjectType, SelectedArea, TileCell, Tileset } from './types'

export const layerTypes: LayerType[] = ['background', 'object', 'foreground', 'collision', 'event']

export function getLayerByType(map: GameMap | null, type: LayerType) {
  return map?.layers.find((layer) => layer.type === type) ?? null
}

export function upsertTileCell(tiles: TileCell[], nextCell: TileCell) {
  const filtered = tiles.filter((tile) => !(tile.x === nextCell.x && tile.y === nextCell.y))
  return [...filtered, nextCell]
}

export function removeTileCell(tiles: TileCell[], x: number, y: number) {
  return tiles.filter((tile) => !(tile.x === x && tile.y === y))
}

export function updateLayerTiles(map: GameMap, layerType: LayerType, nextTiles: TileCell[]) {
  const layers = map.layers.map((layer) => (layer.type === layerType ? { ...layer, tiles: nextTiles } : layer))
  return { ...map, layers }
}

export function getTileAt(layer: MapLayer | null, x: number, y: number) {
  return layer?.tiles.find((tile) => tile.x === x && tile.y === y) ?? null
}

export function findEventAt(events: MapEvent[], x: number, y: number) {
  return events.find((event) => event.x === x && event.y === y) ?? null
}

export function buildTilePalette(tileset: Tileset | null) {
  if (!tileset) {
    return []
  }

  return Array.from({ length: tileset.columns * tileset.rows }, (_, tileIndex) => tileIndex)
}

export function objectTypeForTile(objectTypes: ObjectType[], tilesetId: number | null | undefined, tileIndex: number) {
  const matches = objectTypes.filter((candidate) => (
    tilesetId != null &&
    candidate.tilesetId === tilesetId &&
    candidate.config?.visual?.tileIndex === tileIndex
  ))
  return matches.find((candidate) => candidate.config.defaultSolid) ?? matches.at(-1) ?? null
}

export function findObjectAtCell(objects: MapObject[], objectTypes: ObjectType[], x: number, y: number) {
  return [...objects].reverse().find((object) => {
    const objectType = objectTypes.find((candidate) => String(candidate.id) === String(object.objectTypeId))
    const spanX = objectType?.config?.visual?.spanX ?? objectType?.spanX ?? 1
    const spanY = objectType?.config?.visual?.spanY ?? objectType?.spanY ?? 1
    return x >= object.x && x < object.x + spanX && y >= object.y && y < object.y + spanY
  }) ?? null
}

export function isObjectGroup(group: { metadata?: Record<string, unknown>; name: string; type?: string; system?: boolean }) {
  return Boolean(group.system) || String(group.type ?? '') === 'object' || String(group.metadata?.tileType ?? '') === 'object' || String(group.metadata?.systemRole ?? '') === 'objects' || group.name === 'Objects'
}

export function getTileTone(tilesetId: number | null, tileIndex: number, type: LayerType) {
  if (type === 'collision') {
    return 'rgba(174, 32, 18, 0.8)'
  }

  const seed = (tilesetId ?? 0) * 31 + tileIndex * 17 + type.length * 13
  const hue = seed % 360
  const saturation = type === 'foreground' ? 52 : 45
  const lightness = type === 'foreground' ? 50 : 62
  return `hsl(${hue}deg ${saturation}% ${lightness}%)`
}

export function getCellDisplay(map: GameMap | null, x: number, y: number, events: MapEvent[]) {
  const background = getTileAt(getLayerByType(map, 'background'), x, y)
  const object = getTileAt(getLayerByType(map, 'object'), x, y)
  const foreground = getTileAt(getLayerByType(map, 'foreground'), x, y)
  const collision = getTileAt(getLayerByType(map, 'collision'), x, y)
  const event = findEventAt(events, x, y)

  return {
    background,
    object,
    foreground,
    collision,
    event,
  }
}

export function normalizeSelectedArea(area: SelectedArea) {
  const minX = Math.min(area.start.x, area.end.x)
  const maxX = Math.max(area.start.x, area.end.x)
  const minY = Math.min(area.start.y, area.end.y)
  const maxY = Math.max(area.start.y, area.end.y)

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}
