import type { Tileset } from '../../model/types'

export interface AnimatedTileState {
  baseCol: number
  baseRow: number
  frameSlots: Array<{ col: number; row: number }>
  frameCount: number
  frameDuration: number
  currentFrame: number
  timer: number
}

export class AnimatedTileTracker {
  private readonly animatedTiles = new Map<string, AnimatedTileState>()
  private readonly columnsByTilesetId = new Map<number, number>()

  constructor(tilesets: Tileset[]) {
    for (const tileset of tilesets) {
      this.columnsByTilesetId.set(tileset.id, Math.max(1, tileset.columns))

      const coveredFrameSlots = new Set<string>()
      for (const [slot, metadata] of Object.entries(tileset.tileMap ?? {}).sort(([left], [right]) => compareTileSlots(left, right))) {
        if (coveredFrameSlots.has(slot)) continue
        if (!metadata.animated || !metadata.frameCount || metadata.frameCount <= 1) {
          continue
        }

        const [colRaw, rowRaw] = slot.split(',')
        const baseCol = Number(colRaw)
        const baseRow = Number(rowRaw)
        if (!Number.isFinite(baseCol) || !Number.isFinite(baseRow)) {
          continue
        }

        this.animatedTiles.set(this.key(tileset.id, baseCol, baseRow), {
          baseCol,
          baseRow,
          frameSlots: animationFrameSlots(`${baseCol},${baseRow}`, metadata, tileset.columns),
          frameCount: metadata.frameCount,
          frameDuration: metadata.frameDuration && metadata.frameDuration > 0 ? metadata.frameDuration : 120,
          currentFrame: 0,
          timer: 0,
        })
        for (const frameSlot of animationFrameSlots(`${baseCol},${baseRow}`, metadata, tileset.columns).slice(1)) coveredFrameSlots.add(`${frameSlot.col},${frameSlot.row}`)
      }
    }
  }

  update(dtMs: number): void {
    for (const state of this.animatedTiles.values()) {
      state.timer += dtMs
      while (state.timer >= state.frameDuration) {
        state.timer -= state.frameDuration
        state.currentFrame = (state.currentFrame + 1) % state.frameCount
      }
    }
  }

  getState(tilesetId: number, key: string): AnimatedTileState | null {
    return this.animatedTiles.get(`${tilesetId}:${key}`) ?? null
  }

  resolveTileIndex(tilesetId: number | null, tileIndex: number): number {
    if (tilesetId == null) return tileIndex
    const columns = this.columnsByTilesetId.get(tilesetId)
    if (!columns) return tileIndex

    const baseCol = tileIndex % columns
    const baseRow = Math.floor(tileIndex / columns)
    const state = this.getState(tilesetId, `${baseCol},${baseRow}`)
    if (!state) return tileIndex

    const slot = state.frameSlots[state.currentFrame] ?? state.frameSlots[0]
    return slot.row * columns + slot.col
  }

  private key(tilesetId: number, col: number, row: number): string {
    return `${tilesetId}:${col},${row}`
  }
}

function animationFrameSlots(slot: string, metadata: NonNullable<Tileset['tileMap']>[string], columns: number): Array<{ col: number; row: number }> {
  if (metadata.frameSlots?.length) return metadata.frameSlots
  const [colRaw, rowRaw] = slot.split(',')
  const col = Number(colRaw) || 0
  const row = Number(rowRaw) || 0
  const frameCount = Math.max(1, Number(metadata.frameCount ?? 1))
  const slots: Array<{ col: number; row: number }> = []
  for (let frame = 0; frame < frameCount && col + frame < Math.max(1, columns); frame += 1) {
    slots.push({ col: col + frame, row })
  }
  return slots
}

function compareTileSlots(left: string, right: string): number {
  const [leftColRaw, leftRowRaw] = left.split(',')
  const [rightColRaw, rightRowRaw] = right.split(',')
  const leftCol = Number(leftColRaw) || 0
  const leftRow = Number(leftRowRaw) || 0
  const rightCol = Number(rightColRaw) || 0
  const rightRow = Number(rightRowRaw) || 0
  return leftRow - rightRow || leftCol - rightCol
}
