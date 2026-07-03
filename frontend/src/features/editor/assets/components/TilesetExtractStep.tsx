import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageIcon from '@mui/icons-material/Image'
import RemoveIcon from '@mui/icons-material/Remove'
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import type { TilesetExtractStepProps } from './types'

const ZOOM_LEVELS = [1, 2, 4, 8]

export function TilesetExtractStep({
  projectName,
  assetName,
  setAssetName,
  hideAssetName = false,
  availableTilesets = [],
  selectedTilesetId = '',
  setSelectedTilesetId,
  fixedTilesetName,
  file,
  setFile,
  imageUrl,
  imageNaturalWidth,
  imageNaturalHeight,
}: TilesetExtractStepProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [fitScale, setFitScale] = useState(1)
  const [zoomIndex, setZoomIndex] = useState(0)

  const effectiveScale = fitScale * ZOOM_LEVELS[zoomIndex]
  const displayWidth = imageNaturalWidth * effectiveScale
  const displayHeight = imageNaturalHeight * effectiveScale

  useEffect(() => {
    if (!imageUrl || !scrollContainerRef.current || imageNaturalWidth === 0 || imageNaturalHeight === 0) {
      setFitScale(1)
      return
    }

    const updateScale = () => {
      const container = scrollContainerRef.current
      if (!container) return
      const maxWidth = container.clientWidth * 0.9
      const maxHeight = container.clientHeight * 0.9
      const scale = Math.min(maxWidth / imageNaturalWidth, maxHeight / imageNaturalHeight, 1)
      setFitScale(scale)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(scrollContainerRef.current)
    return () => observer.disconnect()
  }, [imageNaturalHeight, imageNaturalWidth, imageUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !imageUrl || imageNaturalWidth === 0 || imageNaturalHeight === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = imageNaturalWidth
    canvas.height = imageNaturalHeight
    ctx.clearRect(0, 0, imageNaturalWidth, imageNaturalHeight)

    ctx.strokeStyle = 'rgba(93,158,255,0.18)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(0.5, 0.5, imageNaturalWidth - 1, imageNaturalHeight - 1)
  }, [imageNaturalWidth, imageNaturalHeight, imageUrl])

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '280px minmax(0, 1fr)' },
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pl: 3, pr: 2.5, py: 2.5, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
        <TextField
          label="Project"
          value={projectName}
          variant="standard"
          slotProps={{ input: { readOnly: true } }}
          sx={{ '& .MuiInputBase-input': { color: '#8b949e', fontSize: 14 } }}
        />
        {fixedTilesetName ? (
          <TextField
            label="Tileset"
            value={fixedTilesetName}
            variant="standard"
            slotProps={{ input: { readOnly: true } }}
            sx={{ '& .MuiInputBase-input': { color: '#c9d1d9', fontSize: 14 } }}
          />
        ) : hideAssetName && availableTilesets.length > 0 ? (
          <FormControl variant="standard" disabled={availableTilesets.length === 0}>
            <InputLabel>Tileset</InputLabel>
            <Select
              label="Tileset"
              value={selectedTilesetId}
              onChange={(event) => {
                const value = event.target.value as number | ''
                setSelectedTilesetId?.(value === '' ? '' : Number(value))
              }}
              displayEmpty
            >
              <MenuItem value="">Select tileset</MenuItem>
              {availableTilesets.map((tileset) => (
                <MenuItem key={tileset.id} value={tileset.id}>{tileset.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : hideAssetName ? null : (
          <TextField
            label="Tileset name"
            variant="standard"
            value={assetName}
            onChange={(event) => setAssetName(event.target.value)}
          />
        )}
        <Button
          component="label"
          variant="outlined"
          fullWidth
          startIcon={file ? <CheckCircleIcon sx={{ fontSize: 16, color: '#3d8a4e' }} /> : undefined}
          sx={{
            py: 0.75,
            justifyContent: 'flex-start',
            textTransform: 'none',
            fontSize: 13,
            fontWeight: 400,
            color: file ? '#c9d1d9' : '#6a737d',
            background: 'transparent',
            borderColor: 'rgba(255,255,255,0.07)',
            borderRadius: '4px',
            '&:hover': {
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.12)',
            },
          }}
        >
          {file ? file.name : 'Choose PNG'}
          <Box
            component="input"
            hidden
            type="file"
            accept=".png,image/png"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </Button>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: '#080c12',
          backgroundImage: `
            linear-gradient(45deg, #0d1118 25%, transparent 25%),
            linear-gradient(-45deg, #0d1118 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #0d1118 75%),
            linear-gradient(-45deg, transparent 75%, #0d1118 75%)
          `,
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
        }}
      >
        <Box
          ref={scrollContainerRef}
          sx={{ flex: 1, overflow: 'auto' }}
        >
          {!imageUrl ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 1.5, opacity: 0.35 }}>
              <ImageIcon sx={{ fontSize: 48, color: '#6a737d' }} />
              <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: '#6a737d' }}>Upload a PNG to preview</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '100%',
                minHeight: '100%',
                p: 3,
                boxSizing: 'border-box',
              }}
            >
              <Box sx={{ position: 'relative', flexShrink: 0, width: displayWidth, height: displayHeight }}>
                <Box
                  component="img"
                  src={imageUrl}
                  alt=""
                  sx={{
                    display: 'block',
                    width: displayWidth,
                    height: displayHeight,
                    imageRendering: 'pixelated',
                  }}
                />
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: displayWidth,
                    height: displayHeight,
                    pointerEvents: 'none',
                    display: 'block',
                    imageRendering: 'pixelated',
                  }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {imageUrl ? (
          <Box
            sx={{
              flexShrink: 0,
              px: 1.5,
              py: 0.75,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Typography sx={{ fontSize: 11, color: '#8b949e', flex: 1 }}>
              {imageNaturalWidth}×{imageNaturalHeight}px
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <IconButton
                size="small"
                onClick={() => setZoomIndex((z) => Math.max(0, z - 1))}
                disabled={zoomIndex === 0}
                sx={{ width: 22, height: 22, color: '#6a737d', '&:not(:disabled):hover': { color: '#c9d1d9' } }}
              >
                <RemoveIcon sx={{ fontSize: 12 }} />
              </IconButton>
              <Typography sx={{ fontSize: 11, color: '#8b949e', minWidth: 28, textAlign: 'center' }}>
                {ZOOM_LEVELS[zoomIndex]}×
              </Typography>
              <IconButton
                size="small"
                onClick={() => setZoomIndex((z) => Math.min(ZOOM_LEVELS.length - 1, z + 1))}
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                sx={{ width: 22, height: 22, color: '#6a737d', '&:not(:disabled):hover': { color: '#c9d1d9' } }}
              >
                <AddIcon sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}
