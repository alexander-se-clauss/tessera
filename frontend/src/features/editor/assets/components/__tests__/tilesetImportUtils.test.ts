import { describe, it, expect } from 'vitest'
import {
  tilesFromTileset,
  normalizeGroupList,
  applyTilesToLayout,
  normalizeLayout,
  moveLayoutItem,
} from '../tilesetImportUtils'
import type { Tileset, TilesetTile } from '../../../model/types'
import type { GroupDraft } from '../types'

// --- Fixtures ---

function makeTileset(overrides: Partial<Tileset> = {}): Tileset {
  return {
    id: 1, projectId: 1, name: 'Test', imageUrl: 'sheet.png',
    assetType: 'environment', tileWidth: 16, tileHeight: 16,
    columns: 4, rows: 4, margin: 0, spacing: 0,
    sourceImportId: null, tiles: [], groups: [],
    createdAt: '', updatedAt: '',
    ...overrides,
  }
}

function makeTile(index: number, overrides: Partial<TilesetTile> = {}): TilesetTile {
  return {
    id: index + 1,
    extractedTileId: index + 100,
    index,
    imageUrl: `tile-${index}.png`,
    metadata: { tileType: 'floor', solid: false },
    ...overrides,
  }
}

function makeLayout(tileIds: number[], width: number, height: number) {
  const tileRefs = tileIds.map((tileId, i) => ({
    tileId,
    x: i % width,
    y: Math.floor(i / width),
  }))
  return { tileRefs, metadata: { width, height } }
}

// --- normalizeGroupList ---

describe('normalizeGroupList', () => {
  it('does not add an Objects group when none exists', () => {
    const groups: GroupDraft[] = [{
      id: 'terrain',
      name: 'Terrain',
      type: 'environment',
      tileRefs: [],
      metadata: { width: 1, height: 1, tileType: 'floor' },
    }]

    expect(normalizeGroupList(groups)).toEqual(groups)
  })

  it('preserves an existing Objects group', () => {
    const groups: GroupDraft[] = [{
      id: 'objects',
      name: 'Objects',
      type: 'environment',
      tileRefs: [{ tileId: 1, x: 0, y: 0 }],
      metadata: { width: 1, height: 1, tileType: 'object', systemRole: 'objects' },
    }]

    expect(normalizeGroupList(groups)).toEqual(groups)
  })
})

// --- tilesFromTileset ---

describe('tilesFromTileset', () => {
  it('returns extracted tiles from a regular (non-composed) tileset', () => {
    const tileset = makeTileset({
      tiles: [makeTile(0), makeTile(5)],
    })
    const result = tilesFromTileset(tileset)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({ index: 0, hash: 'existing-0', imageUrl: 'tile-0.png' })
    expect(result[1]).toMatchObject({ index: 5, hash: 'existing-5' })
  })

  it('returns tiles from tileMap for a composed tileset', () => {
    const tileset = makeTileset({
      columns: 4,
      tileMap: { '0,0': {}, '1,0': {}, '0,1': {} },
    })
    const result = tilesFromTileset(tileset)
    expect(result).toHaveLength(3)
    // tileIndex for '0,0' = 0*4+0 = 0, '1,0' = 0*4+1 = 1, '0,1' = 1*4+0 = 4
    const indices = result.map(t => t.index).sort((a, b) => a - b)
    expect(indices).toEqual([0, 1, 4])
  })

  it('marks hidden animation frame slots with the existing-frame- hash prefix', () => {
    // Animated tile at '0,0' with 2 frames: frame 1 is at '1,0'
    const tileset = makeTileset({
      columns: 4,
      tileMap: {
        '0,0': { animated: true, frameCount: 2 },
        '1,0': {},
      },
    })
    const result = tilesFromTileset(tileset)
    expect(result).toHaveLength(2)
    const frameTile = result.find(t => t.index === 1) // '1,0' → 0*4+1 = 1
    expect(frameTile?.hash).toMatch(/^existing-frame-/)
    const baseTile = result.find(t => t.index === 0)
    expect(baseTile?.hash).toBe('existing-0')
  })

  it('uses the tiles array when tileMap is present but empty', () => {
    const tileset = makeTileset({
      tiles: [makeTile(0)],
      tileMap: {},
    })
    const result = tilesFromTileset(tileset)
    expect(result).toHaveLength(1)
    expect(result[0].hash).toBe('existing-0')
  })

  it('returns an empty array for a tileset with no tiles and no tileMap', () => {
    const tileset = makeTileset()
    expect(tilesFromTileset(tileset)).toEqual([])
  })
})

// --- normalizeLayout ---

describe('normalizeLayout', () => {
  it('preserves refs that are within bounds', () => {
    const layout = { tileRefs: [{ tileId: 1, x: 0, y: 0 }, { tileId: 2, x: 1, y: 0 }], metadata: { width: 2, height: 1 } }
    const result = normalizeLayout(layout)
    expect(result.tileRefs).toHaveLength(2)
    expect(result.tileRefs).toContainEqual({ tileId: 1, x: 0, y: 0 })
    expect(result.tileRefs).toContainEqual({ tileId: 2, x: 1, y: 0 })
  })

  it('repositions out-of-bounds refs to the next empty slot', () => {
    const layout = {
      tileRefs: [
        { tileId: 1, x: 0, y: 0 },
        { tileId: 2, x: 5, y: 5 }, // out of bounds for 2×2
      ],
      metadata: { width: 2, height: 2 },
    }
    const result = normalizeLayout(layout)
    const ref2 = result.tileRefs.find(r => r.tileId === 2)
    expect(ref2).toBeDefined()
    expect(ref2!.x).toBeGreaterThanOrEqual(0)
    expect(ref2!.x).toBeLessThan(2)
    expect(ref2!.y).toBeGreaterThanOrEqual(0)
    expect(ref2!.y).toBeLessThan(2)
  })

  it('removes duplicate tileIds, keeping the first occurrence', () => {
    const layout = {
      tileRefs: [
        { tileId: 1, x: 0, y: 0 },
        { tileId: 1, x: 1, y: 0 }, // duplicate
        { tileId: 2, x: 0, y: 1 },
      ],
      metadata: { width: 2, height: 2 },
    }
    const result = normalizeLayout(layout)
    const count1 = result.tileRefs.filter(r => r.tileId === 1).length
    expect(count1).toBe(1)
    expect(result.tileRefs).toHaveLength(2)
  })

  it('returns height ≥ 1 even for an empty tileRefs array', () => {
    const layout = { tileRefs: [], metadata: { width: 2, height: 2 } }
    const result = normalizeLayout(layout)
    expect(Number(result.metadata.height)).toBeGreaterThanOrEqual(1)
  })

  it('preserves extra metadata fields', () => {
    const layout = { tileRefs: [], metadata: { width: 1, height: 1, tileType: 'floor', solid: false } }
    const result = normalizeLayout(layout)
    expect(result.metadata.tileType).toBe('floor')
  })
})

// --- applyTilesToLayout ---

describe('applyTilesToLayout', () => {
  it('adds new tiles to an empty layout', () => {
    const layout = { tileRefs: [], metadata: { width: 2, height: 2 } }
    const result = applyTilesToLayout(layout, [1, 2, 3])
    expect(result.tileRefs).toHaveLength(3)
    const ids = result.tileRefs.map(r => r.tileId).sort()
    expect(ids).toEqual([1, 2, 3])
  })

  it('skips tileIds that already exist in the layout', () => {
    const layout = makeLayout([1, 2], 2, 1)
    const result = applyTilesToLayout(layout, [2, 3]) // 2 already exists
    const ids = result.tileRefs.map(r => r.tileId).sort()
    expect(ids).toEqual([1, 2, 3])
  })

  it('expands the grid when tiles overflow the current dimensions', () => {
    const layout = { tileRefs: [], metadata: { width: 1, height: 1 } }
    const result = applyTilesToLayout(layout, [1, 2, 3, 4, 5])
    expect(result.tileRefs).toHaveLength(5)
    const area = Number(result.metadata.width) * Number(result.metadata.height)
    expect(area).toBeGreaterThanOrEqual(5)
  })

  it('places each tile at a unique slot', () => {
    const layout = { tileRefs: [], metadata: { width: 3, height: 3 } }
    const result = applyTilesToLayout(layout, [1, 2, 3, 4])
    const slots = result.tileRefs.map(r => `${r.x}:${r.y}`)
    const unique = new Set(slots)
    expect(unique.size).toBe(slots.length)
  })

  it('is a no-op when all provided tileIds already exist', () => {
    const layout = makeLayout([1, 2], 2, 1)
    const result = applyTilesToLayout(layout, [1, 2])
    expect(result.tileRefs).toHaveLength(2)
  })
})

// --- moveLayoutItem ---

describe('moveLayoutItem', () => {
  it('is a no-op when source and destination coords are the same', () => {
    const layout = { tileRefs: [{ tileId: 1, x: 0, y: 0 }] }
    const result = moveLayoutItem(layout, { tileId: 1, x: 0, y: 0 }, { tileId: null, x: 0, y: 0 })
    expect(result).toBe(layout)
  })

  it('moves a tile to an empty destination slot', () => {
    const layout = { tileRefs: [{ tileId: 1, x: 0, y: 0 }] }
    const result = moveLayoutItem(layout, { tileId: 1, x: 0, y: 0 }, { tileId: null, x: 2, y: 2 })
    expect(result.tileRefs.find(r => r.tileId === 1)).toEqual({ tileId: 1, x: 2, y: 2 })
  })

  it('swaps two tiles when both source and destination have a tileId', () => {
    const layout = {
      tileRefs: [
        { tileId: 1, x: 0, y: 0 },
        { tileId: 2, x: 1, y: 0 },
      ],
    }
    const result = moveLayoutItem(
      layout,
      { tileId: 1, x: 0, y: 0 },
      { tileId: 2, x: 1, y: 0 },
    )
    expect(result.tileRefs.find(r => r.tileId === 1)).toEqual({ tileId: 1, x: 1, y: 0 })
    expect(result.tileRefs.find(r => r.tileId === 2)).toEqual({ tileId: 2, x: 0, y: 0 })
  })

  it('returns the original layout unchanged when source tileId is not found', () => {
    const layout = { tileRefs: [{ tileId: 1, x: 0, y: 0 }] }
    const result = moveLayoutItem(layout, { tileId: 99, x: 0, y: 0 }, { tileId: null, x: 1, y: 1 })
    expect(result).toBe(layout)
  })
})
