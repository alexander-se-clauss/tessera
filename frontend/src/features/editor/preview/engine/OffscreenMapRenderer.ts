import type { ObjectType } from '../../model/types'
import type { LoadedMap, TileImageMap } from './types'
import { TileRenderer } from './TileRenderer'

const zeroCamera = {
  x: 0,
  y: 0,
  viewportW: Number.POSITIVE_INFINITY,
  viewportH: Number.POSITIVE_INFINITY,
}

export class OffscreenMapRenderer {
  private readonly tileRenderer = new TileRenderer()

  renderToCanvas(
    map: LoadedMap,
    tileImages: TileImageMap,
    objectTypes: ObjectType[],
    targetCanvas: HTMLCanvasElement,
  ): void {
    const width = map.width * map.tileWidth
    const height = map.height * map.tileHeight
    targetCanvas.width = width
    targetCanvas.height = height

    const ctx = targetCanvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    const visibleLayers = [...map.layers]
      .filter((layer) => layer.visible && layer.type !== 'collision' && layer.type !== 'event')
      .sort((a, b) => a.order - b.order)

    for (const layer of visibleLayers) {
      this.tileRenderer.drawLayer(ctx, layer, tileImages, map.tileWidth, map.tileHeight, zeroCamera)
    }

    for (const object of map.objects ?? []) {
      if (object.properties.visible === false) continue

      const objectType = objectTypes.find((candidate) => String(candidate.id) === String(object.objectTypeId))
      if (!objectType) continue

      const tileIndex = objectBaseTileIndex(object, objectType)
      const img = tileImages.get(`${objectType.tilesetId}:${tileIndex}`)
      if (!img) continue
      const sourceW = img instanceof HTMLImageElement ? img.naturalWidth : img.width
      const sourceH = img instanceof HTMLImageElement ? img.naturalHeight : img.height
      if (sourceW === 0 || sourceH === 0) continue

      const spanX = objectType.config.visual.spanX ?? objectType.spanX ?? 1
      const spanY = objectType.config.visual.spanY ?? objectType.spanY ?? 1
      ctx.drawImage(
        img,
        0,
        0,
        sourceW,
        sourceH,
        object.x * map.tileWidth,
        object.y * map.tileHeight,
        map.tileWidth * spanX,
        map.tileHeight * spanY,
      )
    }
  }
}

function objectBaseTileIndex(object: LoadedMap['objects'][number], objectType: ObjectType): number {
  if (object.properties.interaction?.type === 'door') {
    const stateName = object.properties.currentState === 'open' ? 'open' : 'closed'
    const sprite = object.properties.states?.[stateName]?.sprite
    if (sprite && Number.isFinite(sprite.tileIndex)) return sprite.tileIndex
  }

  const state = objectType.config.states?.find((candidate) => candidate.name === object.properties.currentState)
  return state?.tileIndex ?? objectType.config.visual.tileIndex
}
