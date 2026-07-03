import type { GameMap, TileHitbox } from '../../model/types'
import type { TileHitboxMap } from './types'
import { tileAssetKey } from './types'

export class CollisionMap {
  private readonly hitboxes: (TileHitbox | null)[]
  private readonly width: number
  private readonly height: number

  constructor(map: GameMap, tileHitboxMap: TileHitboxMap) {
    this.width = map.width
    this.height = map.height
    this.hitboxes = new Array<TileHitbox | null>(map.width * map.height).fill(null)

    const fullTile: TileHitbox = { offsetX: 0, offsetY: 0, width: map.tileWidth, height: map.tileHeight }

    for (const layer of map.layers) {
      if (layer.type === 'event') continue

      for (const cell of layer.tiles) {
        if (cell.x < 0 || cell.x >= map.width || cell.y < 0 || cell.y >= map.height) continue

        if (layer.type === 'collision') {
          this.hitboxes[cell.y * map.width + cell.x] = fullTile
        } else {
          const key = tileAssetKey(cell.tilesetId, cell.tileIndex)
          const hitbox = key ? tileHitboxMap.get(key) : undefined
          if (hitbox) {
            this.hitboxes[cell.y * map.width + cell.x] = hitbox
          }
        }
      }
    }
  }

  isOutOfBounds(tileX: number, tileY: number): boolean {
    return tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height
  }

  getHitbox(tileX: number, tileY: number): TileHitbox | null {
    return this.hitboxes[tileY * this.width + tileX]
  }
}
