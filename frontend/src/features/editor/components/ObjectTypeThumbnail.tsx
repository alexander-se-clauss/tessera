import { Box, Typography } from '@mui/material'
import { useEffect, useRef } from 'react'
import type { ObjectType, Tileset } from '../model/types'

type ObjectTypeThumbnailProps = {
  objectType: ObjectType
  tilesets: Tileset[]
  size?: number
}

export function ObjectTypeThumbnail({ objectType, tilesets, size = 32 }: ObjectTypeThumbnailProps) {
  const tileset = tilesets.find((candidate) => candidate.id === objectType.tilesetId)
  const tile = tileset?.tiles.find((candidate) => candidate.index === objectType.config.visual.tileIndex)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const composedColumns = tileset ? Math.max(1, tileset.columns) : 1
  const composedCol = objectType.config.visual.tileIndex % composedColumns
  const composedRow = Math.floor(objectType.config.visual.tileIndex / composedColumns)
  const hasComposedTile = Boolean(tileset?.tileMap?.[`${composedCol},${composedRow}`])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !tileset || !hasComposedTile || tile) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        image,
        composedCol * tileset.tileWidth,
        composedRow * tileset.tileHeight,
        tileset.tileWidth,
        tileset.tileHeight,
        0,
        0,
        size,
        size,
      )
    }
    image.src = tileset.imageUrl
  }, [composedCol, composedRow, hasComposedTile, size, tile, tileset])

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: 1,
        bgcolor: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {tile ? (
        <Box
          component="img"
          src={tile.imageUrl}
          alt={objectType.name}
          sx={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        />
      ) : hasComposedTile ? (
        <Box
          component="canvas"
          ref={canvasRef}
          width={size}
          height={size}
          sx={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }}
        />
      ) : (
        <Typography sx={{ fontSize: 10, color: 'rgba(220,230,245,0.44)' }}>?</Typography>
      )}
    </Box>
  )
}
