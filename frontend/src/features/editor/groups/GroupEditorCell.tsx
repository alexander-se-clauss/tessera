import { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import type { GameMap, Tileset } from '../model/types'

const CELL_MAX_PX = 96
const EMPTY_COLOR = '#1a1a2e'

// Module-level image cache shared across all cells
const imageCache = new Map<string, HTMLImageElement>()

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => { imageCache.set(url, img); resolve(img) }
    img.onerror = () => resolve(img)
    img.src = url
  })
}

type GroupEditorCellProps = {
  map: GameMap
  tilesets: Tileset[]
  scale: number
  selected: boolean
  cellW: number
  cellH: number
  onClick: () => void
}

export function GroupEditorCell({ map, tilesets, scale, selected, cellW, cellH, onClick }: GroupEditorCellProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // canvas intrinsic size = map's own pixel size
  const canvasW = Math.round(map.width * scale)
  const canvasH = Math.round(map.height * scale)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = EMPTY_COLOR
    ctx.fillRect(0, 0, canvasW, canvasH)

    const bgLayer = map.layers.find((l) => l.type === 'background')
    if (!bgLayer || bgLayer.tiles.length === 0) return

    // Collect unique source images from background layer.
    const needed = new Map<string, string>() // key -> imageUrl
    for (const tile of bgLayer.tiles) {
      if (tile.tilesetId == null) continue
      const ts = tilesets.find((t) => t.id === tile.tilesetId)
      const imageUrl = ts?.imageUrl || ts?.tiles.find((t) => t.index === tile.tileIndex)?.imageUrl
      if (!imageUrl) continue
      const key = `${tile.tilesetId}:${imageUrl}`
      if (!needed.has(key)) needed.set(key, imageUrl)
    }

    if (needed.size === 0) return

    // Load all images then draw
    Promise.all(
      Array.from(needed.entries()).map(([key, url]) =>
        loadImage(url).then((img) => ({ key, img }))
      )
    ).then((entries) => {
      const imgMap = new Map(entries.map(({ key, img }) => [key, img]))

      const c2 = canvasRef.current
      if (!c2) return
      const cx = c2.getContext('2d')
      if (!cx) return
      cx.imageSmoothingEnabled = false
      cx.fillStyle = EMPTY_COLOR
      cx.fillRect(0, 0, canvasW, canvasH)

      const tileDrawW = Math.max(1, Math.round(scale))
      const tileDrawH = Math.max(1, Math.round(scale))

      for (const tile of bgLayer.tiles) {
        if (tile.tilesetId == null) continue
        const ts = tilesets.find((t) => t.id === tile.tilesetId)
        if (!ts) continue
        const imageUrl = ts.imageUrl || ts.tiles.find((t) => t.index === tile.tileIndex)?.imageUrl
        if (!imageUrl) continue
        const key = `${tile.tilesetId}:${imageUrl}`
        const img = imgMap.get(key)
        if (!img || !img.complete || img.naturalWidth === 0) continue
        const destX = Math.round(tile.x * scale)
        const destY = Math.round(tile.y * scale)
        const source = sourceRectForTile(ts, tile.tileIndex, img)
        cx.drawImage(img, source.x, source.y, source.w, source.h, destX, destY, tileDrawW, tileDrawH)
      }
    })
  }, [map.layers, map.width, map.height, tilesets, scale, canvasW, canvasH])

  return (
    <Box
      onClick={onClick}
      sx={{
        width: cellW,
        height: cellH,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderRadius: '2px',
        cursor: 'pointer',
        border: selected ? '2px solid #4d9cff' : '1px solid rgba(255,255,255,0.10)',
        background: selected ? 'rgba(77,156,255,0.12)' : '#0b1016',
        overflow: 'hidden',
        transition: 'border-color 0.1s',
        '&:hover': {
          borderColor: selected ? '#4d9cff' : 'rgba(77,156,255,0.45)',
        },
      }}
    >
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        style={{ display: 'block', imageRendering: 'pixelated' }}
      />
      {/* Name overlay */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          px: '5px',
          pb: '3px',
          pt: '12px',
          pointerEvents: 'none',
        }}
      >
        <Typography
          sx={{
            fontSize: 9,
            color: '#e6edf3',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {map.name}
        </Typography>
      </Box>
    </Box>
  )
}

// Suppress unused import warning — CELL_MAX_PX is used in GroupEditorCanvas
export { CELL_MAX_PX }

function sourceRectForTile(tileset: Tileset, tileIndex: number, image: HTMLImageElement) {
  const tileW = Math.max(1, tileset.tileWidth || image.naturalWidth)
  const tileH = Math.max(1, tileset.tileHeight || image.naturalHeight)
  const columns = Math.max(1, tileset.columns || Math.floor(image.naturalWidth / tileW) || 1)
  const usesComposedImage = Boolean(tileset.imageUrl) && image.src.includes(tileset.imageUrl)
  if (!usesComposedImage && tileset.tiles.some((tile) => tile.index === tileIndex && tile.imageUrl === image.src)) {
    return { x: 0, y: 0, w: image.naturalWidth, h: image.naturalHeight }
  }
  return {
    x: (tileIndex % columns) * tileW,
    y: Math.floor(tileIndex / columns) * tileH,
    w: tileW,
    h: tileH,
  }
}
