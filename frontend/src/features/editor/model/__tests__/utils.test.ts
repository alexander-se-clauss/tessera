import { describe, it, expect } from 'vitest'
import {
  upsertTileCell,
  removeTileCell,
  updateLayerTiles,
  getTileAt,
  findEventAt,
  normalizeSelectedArea,
  objectTypeForTile,
  findObjectAtCell,
  isObjectGroup,
  getTileTone,
} from '../utils'
import type { GameMap, MapEvent, MapLayer, MapObject, ObjectType, TileCell } from '../types'

// --- Fixtures ---

function makeLayer(type: MapLayer['type'] = 'background', tiles: TileCell[] = []): MapLayer {
  return { id: 1, name: type, type, visible: true, locked: false, order: 0, tiles }
}

function makeMap(layers: MapLayer[] = []): GameMap {
  return {
    id: 1, projectId: 1, name: 'Test', width: 10, height: 10,
    tileWidth: 16, tileHeight: 16, layers, objects: [],
    spawnPoint: null, mapGroupId: null, gridCol: null, gridRow: null,
    createdAt: '', updatedAt: '',
  }
}

function makeEvent(x: number, y: number, id = 1): MapEvent {
  return {
    id, mapId: 1, name: 'ev', x, y, type: 'npc',
    iconTile: null, properties: {}, objectTypeId: null,
    createdAt: '', updatedAt: '',
  }
}

function makeObject(id: string, typeId: string, x: number, y: number): MapObject {
  return { id, objectTypeId: typeId, x, y, properties: { objectTypeId: typeId } }
}

function makeObjectType(id: string, tileIndex: number, tilesetId: number, spanX = 1, spanY = 1, defaultSolid = false): ObjectType {
  return {
    id, projectId: 1, tilesetId, name: 'T', category: 'decoration', spanX, spanY,
    config: { visual: { tileIndex, spanX, spanY }, defaultSolid },
    createdAt: '', updatedAt: '',
  }
}

// --- upsertTileCell ---

describe('upsertTileCell', () => {
  it('adds a new cell to an empty array', () => {
    const result = upsertTileCell([], { x: 1, y: 2, tilesetId: 1, tileIndex: 5 })
    expect(result).toEqual([{ x: 1, y: 2, tilesetId: 1, tileIndex: 5 }])
  })

  it('replaces an existing cell at the same coords', () => {
    const existing: TileCell[] = [{ x: 1, y: 2, tilesetId: 1, tileIndex: 5 }]
    const result = upsertTileCell(existing, { x: 1, y: 2, tilesetId: 2, tileIndex: 7 })
    expect(result).toEqual([{ x: 1, y: 2, tilesetId: 2, tileIndex: 7 }])
  })

  it('preserves unrelated cells when replacing', () => {
    const existing: TileCell[] = [
      { x: 0, y: 0, tilesetId: 1, tileIndex: 0 },
      { x: 1, y: 2, tilesetId: 1, tileIndex: 5 },
    ]
    const result = upsertTileCell(existing, { x: 0, y: 0, tilesetId: 1, tileIndex: 99 })
    expect(result).toHaveLength(2)
    expect(result.find(t => t.x === 1 && t.y === 2)).toEqual({ x: 1, y: 2, tilesetId: 1, tileIndex: 5 })
  })

  it('does not mutate the input array', () => {
    const existing: TileCell[] = [{ x: 0, y: 0, tilesetId: 1, tileIndex: 0 }]
    upsertTileCell(existing, { x: 0, y: 0, tilesetId: 1, tileIndex: 99 })
    expect(existing[0].tileIndex).toBe(0)
  })
})

// --- removeTileCell ---

describe('removeTileCell', () => {
  it('removes the matching cell', () => {
    const tiles: TileCell[] = [{ x: 1, y: 2, tilesetId: 1, tileIndex: 5 }]
    expect(removeTileCell(tiles, 1, 2)).toEqual([])
  })

  it('is a no-op when the cell is absent', () => {
    const tiles: TileCell[] = [{ x: 1, y: 2, tilesetId: 1, tileIndex: 5 }]
    expect(removeTileCell(tiles, 9, 9)).toEqual(tiles)
  })

  it('only removes the cell at the exact coords', () => {
    const tiles: TileCell[] = [
      { x: 1, y: 2, tilesetId: 1, tileIndex: 5 },
      { x: 3, y: 4, tilesetId: 1, tileIndex: 6 },
    ]
    const result = removeTileCell(tiles, 1, 2)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ x: 3, y: 4, tilesetId: 1, tileIndex: 6 })
  })
})

// --- updateLayerTiles ---

describe('updateLayerTiles', () => {
  it('replaces tiles on the target layer', () => {
    const bg = makeLayer('background', [{ x: 0, y: 0, tilesetId: 1, tileIndex: 1 }])
    const map = makeMap([bg])
    const newTiles: TileCell[] = [{ x: 5, y: 5, tilesetId: 1, tileIndex: 99 }]
    const result = updateLayerTiles(map, 'background', newTiles)
    expect(result.layers.find(l => l.type === 'background')?.tiles).toEqual(newTiles)
  })

  it('leaves other layers unchanged', () => {
    const bg = makeLayer('background', [{ x: 0, y: 0, tilesetId: 1, tileIndex: 1 }])
    const fg = makeLayer('foreground', [{ x: 1, y: 1, tilesetId: 1, tileIndex: 2 }])
    const map = makeMap([bg, { ...fg, id: 2 }])
    const result = updateLayerTiles(map, 'background', [])
    expect(result.layers.find(l => l.type === 'foreground')?.tiles).toEqual(fg.tiles)
  })

  it('does not mutate the original map', () => {
    const bg = makeLayer('background', [{ x: 0, y: 0, tilesetId: 1, tileIndex: 1 }])
    const map = makeMap([bg])
    updateLayerTiles(map, 'background', [])
    expect(map.layers[0].tiles).toHaveLength(1)
  })
})

// --- getTileAt ---

describe('getTileAt', () => {
  it('returns the tile at the given coords', () => {
    const layer = makeLayer('background', [{ x: 3, y: 4, tilesetId: 1, tileIndex: 7 }])
    expect(getTileAt(layer, 3, 4)).toEqual({ x: 3, y: 4, tilesetId: 1, tileIndex: 7 })
  })

  it('returns null when no tile at coords', () => {
    const layer = makeLayer('background', [{ x: 3, y: 4, tilesetId: 1, tileIndex: 7 }])
    expect(getTileAt(layer, 0, 0)).toBeNull()
  })

  it('returns null when layer is null', () => {
    expect(getTileAt(null, 0, 0)).toBeNull()
  })
})

// --- findEventAt ---

describe('findEventAt', () => {
  it('finds an event at the given coords', () => {
    const events = [makeEvent(2, 3)]
    expect(findEventAt(events, 2, 3)).toMatchObject({ x: 2, y: 3 })
  })

  it('returns null when no event at coords', () => {
    expect(findEventAt([makeEvent(2, 3)], 9, 9)).toBeNull()
  })

  it('returns null for an empty event list', () => {
    expect(findEventAt([], 0, 0)).toBeNull()
  })
})

// --- normalizeSelectedArea ---

describe('normalizeSelectedArea', () => {
  it('normalizes a standard top-left → bottom-right selection', () => {
    const result = normalizeSelectedArea({ start: { x: 1, y: 2 }, end: { x: 4, y: 5 } })
    expect(result).toEqual({ minX: 1, minY: 2, maxX: 4, maxY: 5, width: 4, height: 4 })
  })

  it('normalizes a reversed (drag up-left) selection', () => {
    const result = normalizeSelectedArea({ start: { x: 4, y: 5 }, end: { x: 1, y: 2 } })
    expect(result).toEqual({ minX: 1, minY: 2, maxX: 4, maxY: 5, width: 4, height: 4 })
  })

  it('handles a single-cell selection', () => {
    const result = normalizeSelectedArea({ start: { x: 3, y: 3 }, end: { x: 3, y: 3 } })
    expect(result).toEqual({ minX: 3, minY: 3, maxX: 3, maxY: 3, width: 1, height: 1 })
  })

  it('handles a selection spanning only one axis', () => {
    const result = normalizeSelectedArea({ start: { x: 0, y: 2 }, end: { x: 3, y: 2 } })
    expect(result).toEqual({ minX: 0, minY: 2, maxX: 3, maxY: 2, width: 4, height: 1 })
  })
})

// --- objectTypeForTile ---

describe('objectTypeForTile', () => {
  it('returns null when no types match the tilesetId + tileIndex', () => {
    const types = [makeObjectType('a', 3, 5)]
    expect(objectTypeForTile(types, 5, 99)).toBeNull()
  })

  it('returns null when tilesetId is null', () => {
    const types = [makeObjectType('a', 3, 5)]
    expect(objectTypeForTile(types, null, 3)).toBeNull()
  })

  it('prefers the defaultSolid match when multiple types share the same tile', () => {
    const types = [
      makeObjectType('a', 3, 5, 1, 1, false),
      makeObjectType('b', 3, 5, 1, 1, true),
    ]
    expect(objectTypeForTile(types, 5, 3)?.id).toBe('b')
  })

  it('falls back to the last match when no defaultSolid candidate', () => {
    const types = [
      makeObjectType('a', 3, 5, 1, 1, false),
      makeObjectType('b', 3, 5, 1, 1, false),
    ]
    expect(objectTypeForTile(types, 5, 3)?.id).toBe('b')
  })

  it('returns the single match directly', () => {
    const types = [makeObjectType('only', 3, 5)]
    expect(objectTypeForTile(types, 5, 3)?.id).toBe('only')
  })
})

// --- findObjectAtCell ---

describe('findObjectAtCell', () => {
  it('returns null when no objects', () => {
    expect(findObjectAtCell([], [], 0, 0)).toBeNull()
  })

  it('finds an object at its exact origin', () => {
    const obj = makeObject('1', 'typeA', 2, 3)
    const type = makeObjectType('typeA', 0, 1)
    expect(findObjectAtCell([obj], [type], 2, 3)).toBe(obj)
  })

  it('misses when coords are outside a 1×1 object', () => {
    const obj = makeObject('1', 'typeA', 2, 3)
    const type = makeObjectType('typeA', 0, 1)
    expect(findObjectAtCell([obj], [type], 3, 3)).toBeNull()
  })

  it('hits inside the span of a multi-cell object', () => {
    const obj = makeObject('1', 'typeA', 2, 3)
    const type = makeObjectType('typeA', 0, 1, 2, 2)
    expect(findObjectAtCell([obj], [type], 3, 4)).toBe(obj)
  })

  it('misses just outside the span of a multi-cell object', () => {
    const obj = makeObject('1', 'typeA', 2, 3)
    const type = makeObjectType('typeA', 0, 1, 2, 2)
    expect(findObjectAtCell([obj], [type], 4, 3)).toBeNull()
  })

  it('returns the topmost (last in array) object when objects overlap', () => {
    const obj1 = makeObject('1', 'typeA', 0, 0)
    const obj2 = makeObject('2', 'typeA', 0, 0)
    const type = makeObjectType('typeA', 0, 1)
    expect(findObjectAtCell([obj1, obj2], [type], 0, 0)).toBe(obj2)
  })
})

// --- isObjectGroup ---

describe('isObjectGroup', () => {
  it('returns true when system flag is set', () => {
    expect(isObjectGroup({ name: 'Anything', system: true })).toBe(true)
  })

  it('returns true when type is "object"', () => {
    expect(isObjectGroup({ name: 'G', type: 'object' })).toBe(true)
  })

  it('returns true when metadata.tileType is "object"', () => {
    expect(isObjectGroup({ name: 'G', metadata: { tileType: 'object' } })).toBe(true)
  })

  it('returns true when metadata.systemRole is "objects"', () => {
    expect(isObjectGroup({ name: 'G', metadata: { systemRole: 'objects' } })).toBe(true)
  })

  it('returns true when name is "Objects"', () => {
    expect(isObjectGroup({ name: 'Objects' })).toBe(true)
  })

  it('returns false for a regular terrain group', () => {
    expect(isObjectGroup({ name: 'Terrain', type: 'environment' })).toBe(false)
  })
})

// --- getTileTone ---

describe('getTileTone', () => {
  it('returns the fixed collision color for collision layers', () => {
    expect(getTileTone(1, 0, 'collision')).toBe('rgba(174, 32, 18, 0.8)')
    expect(getTileTone(null, 5, 'collision')).toBe('rgba(174, 32, 18, 0.8)')
  })

  it('returns an hsl string for background layers', () => {
    const color = getTileTone(1, 0, 'background')
    expect(color).toMatch(/^hsl\(\d+deg \d+% \d+%\)$/)
  })

  it('produces the same color for the same inputs (deterministic)', () => {
    expect(getTileTone(3, 7, 'background')).toBe(getTileTone(3, 7, 'background'))
  })

  it('produces different colors for different tilesets', () => {
    expect(getTileTone(1, 0, 'background')).not.toBe(getTileTone(2, 0, 'background'))
  })
})
