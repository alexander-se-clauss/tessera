import type { GameMap, GroupNeighbors, ObjectType, TileHitbox, Tileset } from '../../model/types'

export type LoadedMap = GameMap

export type ScreenTransitionDirection = 'east' | 'west' | 'north' | 'south'

export interface ScreenTransition {
  direction: ScreenTransitionDirection
  fromMap: LoadedMap
  toMap: LoadedMap
  playerEntryX: number
  playerEntryY: number
  playerStartX: number
  playerStartY: number
  progress: number
  duration: number
  elapsed: number
  fromCanvas: HTMLCanvasElement
  toCanvas: HTMLCanvasElement
}

export type TileImageKey = `${number}:${number}`
export type TileImageSource = HTMLImageElement | HTMLCanvasElement
export type TileImageMap = Map<TileImageKey, TileImageSource>
export type TileHitboxKey = `${number}:${number}`
export type TileHitboxMap = Map<TileHitboxKey, TileHitbox>

export type GameEngineAssets = {
  tilesets: Tileset[]
  objectTypes: ObjectType[]
  tileImages: TileImageMap
  tileHitboxes: TileHitboxMap
}

export type GameEngineApi = {
  authToken: string | null
}

export type NeighborCacheKey = `${number}:${number}:${number}`
export type NeighborData = GroupNeighbors

export function tileAssetKey(tilesetId: number | null, tileIndex: number): TileImageKey | null {
  return tilesetId === null ? null : `${tilesetId}:${tileIndex}`
}
