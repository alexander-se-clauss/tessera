import type { ExtractedTile, TileGroup, TileRef, TileType, Tileset } from '../../model/types'
import type { AssetType } from '../../model/types'
import type { GroupDraft, TileOverride } from './types'

export const OBJECTS_GROUP_ID = 'system-objects'

export function createObjectsGroup(tileRefs: TileRef[] = []): GroupDraft {
  return {
    id: OBJECTS_GROUP_ID,
    name: 'Objects',
    type: 'environment',
    tileRefs,
    metadata: {
      width: 1,
      height: 1,
      tileType: 'object',
      solid: true,
      defaultCollision: 'solid',
      collisionBehavior: 'group',
      systemRole: 'objects',
    },
  }
}

export function normalizeGroupList(groups: GroupDraft[]): GroupDraft[] {
  return groups
}

export function mapExistingGroupToDraft(group: TileGroup): GroupDraft {
  const isObjectsGroup = group.name === 'Objects' || group.type === 'object' || group.metadata?.systemRole === 'objects'
  return {
    id: String(group.id),
    name: group.name,
    type: group.type as AssetType,
    tileRefs: group.tileRefs ?? [],
    metadata: {
      width: Number(group.metadata?.width ?? 1),
      height: Number(group.metadata?.height ?? 1),
      tileType: String(group.metadata?.tileType ?? (isObjectsGroup ? 'object' : 'floor')),
      solid: Boolean(group.metadata?.solid ?? isObjectsGroup),
      defaultCollision: String(group.metadata?.defaultCollision ?? ((group.metadata?.solid ?? isObjectsGroup) ? 'solid' : 'none')),
      collisionBehavior: String(group.metadata?.collisionBehavior ?? 'group'),
      systemRole: isObjectsGroup ? 'objects' : group.metadata?.systemRole,
      tileOverrides: stripImportOffsets((group.metadata?.tileOverrides as Record<string, TileOverride> | undefined) ?? {}),
      ...(group.metadata?.isStateful ? { isStateful: group.metadata.isStateful } : {}),
      ...(group.metadata?.stateDefs ? { stateDefs: group.metadata.stateDefs } : {}),
      ...(group.metadata?.stateTransitions ? { stateTransitions: group.metadata.stateTransitions } : {}),
    },
  }
}

export function stripImportOffsets(overrides: Record<string, TileOverride>): Record<string, TileOverride> {
  return Object.fromEntries(
    Object.entries(overrides).map(([tileId, override]) => {
      const { sourceOffsetX: _sourceOffsetX, sourceOffsetY: _sourceOffsetY, ...persistedOverride } = override
      const normalizedAnimationFrames = persistedOverride.animationFrames?.map((frame) => ({
        ...frame,
        x: 0,
        y: 0,
      }))
      return [tileId, normalizedAnimationFrames ? { ...persistedOverride, animationFrames: normalizedAnimationFrames } : persistedOverride]
    }),
  )
}

export function tilesFromTileset(tileset: Tileset): ExtractedTile[] {
  const hasComposedTiles = Object.keys(tileset.tileMap ?? {}).length > 0
  if (!hasComposedTiles && tileset.tiles.length > 0) {
    return tileset.tiles.map((tile) => ({
      id: tile.extractedTileId || tile.index + 1,
      index: tile.index,
      hash: `existing-${tile.index}`,
      imageUrl: tile.imageUrl,
      sourceOccurrences: [{ x: (tile.index % Math.max(1, tileset.columns)) * tileset.tileWidth, y: Math.floor(tile.index / Math.max(1, tileset.columns)) * tileset.tileHeight }],
    }))
  }

  const hiddenFrameSlots = buildHiddenFrameSlots(tileset)

  return Object.keys(tileset.tileMap ?? {}).sort(compareTileSlots).map((slot, index) => {
    const [colRaw, rowRaw] = slot.split(',')
    const col = Number(colRaw) || 0
    const row = Number(rowRaw) || 0
    const tileIndex = row * Math.max(1, tileset.columns) + col
    return {
      id: index + 1,
      index: tileIndex,
      hash: hiddenFrameSlots.has(slot) ? `existing-frame-${tileIndex}` : `existing-${tileIndex}`,
      imageUrl: tileset.imageUrl,
      sourceOccurrences: [{ x: col * tileset.tileWidth, y: row * tileset.tileHeight }],
    }
  })
}

export function isExistingFrameTile(tile: ExtractedTile) {
  return String(tile.hash).startsWith('existing-frame-')
}

function buildHiddenFrameSlots(tileset: Tileset): Set<string> {
  const hiddenFrameSlots = new Set<string>()
  for (const [slot, metadata] of baseAnimationEntries(tileset)) {
    if (!metadata.animated || !metadata.frameCount || metadata.frameCount <= 1) continue
    for (const frameSlot of animationFrameSlots(slot, metadata, tileset).slice(1)) hiddenFrameSlots.add(frameSlot)
  }
  return hiddenFrameSlots
}

function buildBaseSlotByFrameSlot(tileset: Tileset): Map<string, string> {
  const baseSlotByFrameSlot = new Map<string, string>()
  for (const [slot, metadata] of baseAnimationEntries(tileset)) {
    if (!metadata.animated || !metadata.frameCount || metadata.frameCount <= 1) continue
    for (const frameSlot of animationFrameSlots(slot, metadata, tileset).slice(1)) baseSlotByFrameSlot.set(frameSlot, slot)
  }
  return baseSlotByFrameSlot
}

export function groupsFromTileset(tileset: Tileset, tiles: ExtractedTile[]): GroupDraft[] {
  const tileIdBySlot = new Map<string, number>()
  for (const tile of tiles) {
    tileIdBySlot.set(slotForTileIndex(tile.index, tileset), tile.id)
  }
  const animationOverrides = buildAnimationOverrides(tileset, tileIdBySlot)
  const baseSlotByFrameSlot = buildBaseSlotByFrameSlot(tileset)

  const existingGroups = tileset.groups
    .map((group) => {
      const layoutWidth = Math.max(1, Number(group.metadata?.width ?? 1))
      const visibleSlots = Array.from(new Set((group.tiles ?? []).map((slot) => baseSlotByFrameSlot.get(slot) ?? slot)))
      const refs = visibleSlots
        .map((slot, index) => {
          const existingPosition = group.tileRefs?.[index]
          return {
            tileId: tileIdBySlot.get(slot) ?? null,
            x: existingPosition?.x ?? index % layoutWidth,
            y: existingPosition?.y ?? Math.floor(index / layoutWidth),
          }
        })
        .filter((ref): ref is TileRef => ref.tileId != null)
      const fallbackRefs = (group.tileRefs ?? []).filter((ref) => tiles.some((tile) => tile.id === ref.tileId))
      const draft = mapExistingGroupToDraft({ ...group, tileRefs: refs.length > 0 ? refs : fallbackRefs })
      const requiredWidth = Math.max(
        Number(draft.metadata.width ?? 1),
        ...draft.tileRefs.map((ref) => ref.x + 1),
        1,
      )
      const requiredHeight = Math.max(
        Number(draft.metadata.height ?? 1),
        ...draft.tileRefs.map((ref) => ref.y + 1),
        1,
      )
      return {
        ...draft,
        metadata: {
          ...draft.metadata,
          width: requiredWidth,
          height: requiredHeight,
          tileOverrides: mergeReconstructedAnimationOverrides(
            (draft.metadata.tileOverrides as Record<string, TileOverride> | undefined) ?? {},
            animationOverrides,
          ),
        },
      }
    })
    .filter((group) => group.tileRefs.length > 0)

  if (existingGroups.length > 0) {
    return normalizeGroupList(existingGroups)
  }

  const byGroupName = new Map<string, GroupDraft>()
  for (const tile of tileset.tiles) {
    const tileId = tile.extractedTileId || tile.index + 1
    const groupName = String(tile.metadata.groupName ?? 'Imported')
    const group = byGroupName.get(groupName) ?? {
      id: String(tile.metadata.groupId ?? crypto.randomUUID()),
      name: groupName,
      type: 'environment',
      tileRefs: [],
      metadata: {
        width: 1,
        height: 1,
        tileType: tile.metadata.tileType ?? 'floor',
        solid: Boolean(tile.metadata.solid),
        defaultCollision: tile.metadata.solid ? 'solid' : 'none',
        collisionBehavior: 'group',
      },
    }
    group.tileRefs.push({
      tileId,
      x: Number(tile.metadata.groupX ?? group.tileRefs.length),
      y: Number(tile.metadata.groupY ?? 0),
    })
    group.metadata.width = Math.max(Number(group.metadata.width ?? 1), Number(tile.metadata.groupX ?? group.tileRefs.length - 1) + 1)
    group.metadata.height = Math.max(Number(group.metadata.height ?? 1), Number(tile.metadata.groupY ?? 0) + 1)
    byGroupName.set(groupName, group)
  }

  return normalizeGroupList(Array.from(byGroupName.values()))
}

function mergeReconstructedAnimationOverrides(
  persisted: Record<string, TileOverride>,
  reconstructed: Record<string, TileOverride>,
): Record<string, TileOverride> {
  const merged: Record<string, TileOverride> = { ...persisted }
  for (const [tileId, animationOverride] of Object.entries(reconstructed)) {
    merged[tileId] = {
      ...(merged[tileId] ?? {}),
      animationFrames: animationOverride.animationFrames,
      animationFrameTileIds: animationOverride.animationFrameTileIds,
      animationFrameDuration: animationOverride.animationFrameDuration,
      animationLoop: animationOverride.animationLoop,
    }
  }
  return merged
}

function buildAnimationOverrides(tileset: Tileset, tileIdBySlot: Map<string, number>): Record<string, TileOverride> {
  const overrides: Record<string, TileOverride> = {}
  for (const [slot, metadata] of baseAnimationEntries(tileset)) {
    if (!metadata.animated || !metadata.frameCount || metadata.frameCount <= 1) continue
    const baseTileId = tileIdBySlot.get(slot)
    if (baseTileId == null) continue
    const slots = animationFrameSlots(slot, metadata, tileset)
    const [baseColRaw, baseRowRaw] = slot.split(',')
    const baseCol = Number(baseColRaw) || 0
    const baseRow = Number(baseRowRaw) || 0
    const frameIds: number[] = [baseTileId]
    const animationFrames = [{ tileId: baseTileId, tileIndex: baseRow * Math.max(1, tileset.columns ?? 16) + baseCol, x: 0, y: 0 }]
    for (const frameSlot of slots.slice(1)) {
      const [colRaw, rowRaw] = frameSlot.split(',')
      const col = Number(colRaw) || 0
      const row = Number(rowRaw) || 0
      const frameTileId = tileIdBySlot.get(frameSlot)
      if (frameTileId != null) {
        frameIds.push(frameTileId)
        animationFrames.push({
          tileId: frameTileId,
          tileIndex: row * Math.max(1, tileset.columns ?? 16) + col,
          x: 0,
          y: 0,
        })
      }
    }
    overrides[String(baseTileId)] = {
      animationFrames,
      animationFrameTileIds: frameIds,
      animationFrameDuration: metadata.frameDuration ?? 120,
      animationLoop: true,
    }
  }
  return overrides
}

function baseAnimationEntries(tileset: Tileset): Array<[string, NonNullable<Tileset['tileMap']>[string]]> {
  const entries = Object.entries(tileset.tileMap ?? {}).sort(([left], [right]) => compareTileSlots(left, right))
  const coveredFrameSlots = new Set<string>()
  const bases: Array<[string, NonNullable<Tileset['tileMap']>[string]]> = []
  for (const [slot, metadata] of entries) {
    if (coveredFrameSlots.has(slot)) continue
    if (!metadata.animated || !metadata.frameCount || metadata.frameCount <= 1) continue
    bases.push([slot, metadata])
    for (const frameSlot of animationFrameSlots(slot, metadata, tileset).slice(1)) coveredFrameSlots.add(frameSlot)
  }
  return bases
}

function animationFrameSlots(slot: string, metadata: NonNullable<Tileset['tileMap']>[string], tileset: Tileset): string[] {
  if (metadata.frameSlots?.length) {
    return metadata.frameSlots.map((frameSlot) => `${frameSlot.col},${frameSlot.row}`)
  }
  const [colRaw, rowRaw] = slot.split(',')
  const col = Number(colRaw) || 0
  const row = Number(rowRaw) || 0
  const frameCount = Math.max(1, Number(metadata.frameCount ?? 1))
  const columns = Math.max(1, tileset.columns ?? 16)
  const slots: string[] = []
  for (let frame = 0; frame < frameCount && col + frame < columns; frame += 1) {
    slots.push(`${col + frame},${row}`)
  }
  return slots
}

export function slotForTileIndex(tileIndex: number, tileset: Tileset) {
  const columns = Math.max(1, tileset.columns || Math.floor((tileset.composedWidth ?? 256) / Math.max(1, tileset.tileWidth)))
  return `${tileIndex % columns},${Math.floor(tileIndex / columns)}`
}

function compareTileSlots(a: string, b: string): number {
  const [aColRaw, aRowRaw] = a.split(',')
  const [bColRaw, bRowRaw] = b.split(',')
  const aCol = Number(aColRaw) || 0
  const aRow = Number(aRowRaw) || 0
  const bCol = Number(bColRaw) || 0
  const bRow = Number(bRowRaw) || 0
  return aRow === bRow ? aCol - bCol : aRow - bRow
}

export function applyTilesToLayout<T extends { tileRefs: TileRef[]; metadata: Record<string, unknown> }>(target: T, tileIds: number[]) {
  const existingIds = new Set(target.tileRefs.map((ref) => ref.tileId))
  const nextTileRefs = [...target.tileRefs]
  const nextCount = existingIds.size + tileIds.filter((tileId) => !existingIds.has(tileId)).length
  const currentWidth = Math.max(1, Number(target.metadata.width ?? 1))
  let width = currentWidth
  let height = Math.max(1, Number(target.metadata.height ?? 1))

  if (width * height < nextCount) {
    width = Math.max(width, Math.ceil(Math.sqrt(nextCount)))
    height = Math.max(height, Math.ceil(nextCount / width))
  }

  let occupied = buildOccupiedSet(nextTileRefs, width, height)
  for (const tileId of tileIds) {
    if (existingIds.has(tileId)) continue
    const slot = findNextEmptySlot(occupied, width, height)
    if (!slot) {
      height += 1
      occupied = buildOccupiedSet(nextTileRefs, width, height)
    }
    const nextSlot = slot ?? findNextEmptySlot(occupied, width, height)
    if (!nextSlot) continue
    nextTileRefs.push({ tileId, x: nextSlot.x, y: nextSlot.y })
    occupied.add(slotKey(nextSlot.x, nextSlot.y))
    existingIds.add(tileId)
  }

  return normalizeLayout({
    ...target,
    tileRefs: nextTileRefs,
    metadata: { ...target.metadata, width, height },
  })
}

export function normalizeLayout<T extends { tileRefs: TileRef[]; metadata: Record<string, unknown> }>(target: T) {
  const width = Math.max(1, Number(target.metadata.width ?? 1))
  const height = Math.max(1, Number(target.metadata.height ?? 1))
  const orderedTileIds = Array.from(new Set(target.tileRefs.map((ref) => ref.tileId)))
  const used = new Set<string>()
  const preserved: TileRef[] = []
  const overflowTileIds: number[] = []

  for (const tileId of orderedTileIds) {
    const ref = target.tileRefs.find((entry) => entry.tileId === tileId)
    if (!ref) continue
    const key = slotKey(ref.x, ref.y)
    const insideBounds = ref.x >= 0 && ref.x < width && ref.y >= 0 && ref.y < height
    if (insideBounds && !used.has(key)) {
      preserved.push({ tileId, x: ref.x, y: ref.y })
      used.add(key)
    } else {
      overflowTileIds.push(tileId)
    }
  }

  for (const tileId of overflowTileIds) {
    const slot = findNextEmptySlot(used, width, height)
    if (!slot) break
    preserved.push({ tileId, x: slot.x, y: slot.y })
    used.add(slotKey(slot.x, slot.y))
  }

  const maxOccupiedRow = preserved.reduce((max, ref) => Math.max(max, ref.y), 0)
  const minHeight = preserved.length > 0 ? maxOccupiedRow + 1 : 1

  return {
    ...target,
    tileRefs: preserved,
    metadata: { ...target.metadata, width, height: Math.max(height, minHeight) },
  }
}

export function moveLayoutItem<T extends { tileRefs: TileRef[] }>(target: T, source: { tileId: number | null; x: number; y: number }, destination: { tileId: number | null; x: number; y: number }) {
  if (source.x === destination.x && source.y === destination.y) return target
  const sourceRef = source.tileId != null ? target.tileRefs.find((ref) => ref.tileId === source.tileId) : null
  const destinationRef = destination.tileId != null ? target.tileRefs.find((ref) => ref.tileId === destination.tileId) : null
  if (source.tileId != null && !sourceRef) return target
  if (destination.tileId != null && !destinationRef) return target
  return {
    ...target,
    tileRefs: target.tileRefs.map((ref) => {
      if (source.tileId != null && ref.tileId === source.tileId) return { ...ref, x: destination.x, y: destination.y }
      if (destination.tileId != null && ref.tileId === destination.tileId) return { ...ref, x: source.x, y: source.y }
      return ref
    }),
  }
}

function slotKey(x: number, y: number) {
  return `${x}:${y}`
}

function buildOccupiedSet(tileRefs: TileRef[], width: number, height: number) {
  return new Set(
    tileRefs
      .filter((ref) => ref.x >= 0 && ref.x < width && ref.y >= 0 && ref.y < height)
      .map((ref) => slotKey(ref.x, ref.y)),
  )
}

function findNextEmptySlot(occupied: Set<string>, width: number, height: number) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.has(slotKey(x, y))) return { x, y }
    }
  }
  return null
}

export function tileTypeFromGroupId(groups: GroupDraft[], groupId: string): TileType | undefined {
  return groups.find((g) => g.id === groupId)?.metadata.tileType as TileType | undefined
}
