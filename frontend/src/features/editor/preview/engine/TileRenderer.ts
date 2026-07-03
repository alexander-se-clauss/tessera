import type { MapLayer } from '../../model/types'
import type { TileImageMap } from './types'
import { tileAssetKey } from './types'
import type { AnimatedTileTracker } from './AnimatedTileTracker'

type CameraView = {
  x: number
  y: number
  viewportW: number
  viewportH: number
}

export class TileRenderer {
  drawLayer(
    ctx: CanvasRenderingContext2D,
    layer: MapLayer,
    tileImages: TileImageMap,
    tileW: number,
    tileH: number,
    camera: CameraView,
    animatedTileTracker?: AnimatedTileTracker,
  ): void {
    ctx.imageSmoothingEnabled = false

    for (const cell of layer.tiles) {
      const tileIndex = animatedTileTracker?.resolveTileIndex(cell.tilesetId, cell.tileIndex) ?? cell.tileIndex
      const key = tileAssetKey(cell.tilesetId, tileIndex)
      const img = key ? tileImages.get(key) : undefined
      if (!img) continue
      const sourceW = img instanceof HTMLImageElement ? img.naturalWidth : img.width
      const sourceH = img instanceof HTMLImageElement ? img.naturalHeight : img.height
      if (sourceW === 0 || sourceH === 0) continue

      const screenX = cell.x * tileW - camera.x
      const screenY = cell.y * tileH - camera.y

      if (screenX + tileW < 0 || screenX > camera.viewportW) continue
      if (screenY + tileH < 0 || screenY > camera.viewportH) continue

      ctx.drawImage(img, 0, 0, sourceW, sourceH, Math.round(screenX), Math.round(screenY), tileW, tileH)
    }
  }
}
