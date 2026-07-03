import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageIcon from '@mui/icons-material/Image'
import { Box, Button, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'

type UploadStepProps = {
  projectName: string
  spriteName: string
  setSpriteName: (name: string) => void
  baseFrameWidth: number
  setBaseFrameWidth: (w: number) => void
  baseFrameHeight: number
  setBaseFrameHeight: (h: number) => void
  file: File | null
  setFile: (file: File | null) => void
  imageUrl: string
  imageNaturalWidth: number
  imageNaturalHeight: number
}

export function UploadStep({
  projectName,
  spriteName,
  setSpriteName,
  baseFrameWidth,
  setBaseFrameWidth,
  baseFrameHeight,
  setBaseFrameHeight,
  file,
  setFile,
  imageUrl,
  imageNaturalWidth,
  imageNaturalHeight,
}: UploadStepProps) {
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [previewScale, setPreviewScale] = useState(1)
  const inputSx = {
    '& .MuiInputLabel-root': {
      fontSize: 11,
      color: 'rgba(220,230,245,0.52)',
      letterSpacing: '0.04em',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: 'rgba(220,230,245,0.58)',
    },
    '& .MuiInputBase-input': {
      fontSize: 14,
    },
  }

  const columns =
    imageNaturalWidth > 0 && baseFrameWidth > 0
      ? Math.max(1, Math.floor(imageNaturalWidth / baseFrameWidth))
      : 0
  const rows =
    imageNaturalHeight > 0 && baseFrameHeight > 0
      ? Math.max(1, Math.floor(imageNaturalHeight / baseFrameHeight))
      : 0

  useEffect(() => {
    if (!imageUrl || !previewRef.current || imageNaturalWidth === 0 || imageNaturalHeight === 0) {
      setPreviewScale(1)
      return
    }

    const updateScale = () => {
      const container = previewRef.current
      if (!container) { return }
      const maxWidth = container.clientWidth * 0.9
      const maxHeight = container.clientHeight * 0.9
      const scale = Math.min(maxWidth / imageNaturalWidth, maxHeight / imageNaturalHeight, 1)
      setPreviewScale(scale)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(previewRef.current)
    return () => observer.disconnect()
  }, [imageNaturalHeight, imageNaturalWidth, imageUrl])

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
      {/* Left: form */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
          pl: 3,
          pr: 2.5,
          py: 2.5,
          borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto',
        }}
      >
        <TextField
          label="Project"
          value={projectName}
          variant="standard"
          slotProps={{ input: { readOnly: true } }}
          sx={{ ...inputSx, '& .MuiInputBase-input': { color: '#8b949e', fontSize: 14 } }}
        />
        <TextField
          label="Sprite name"
          placeholder="Sprite name"
          variant="standard"
          value={spriteName}
          onChange={(event) => setSpriteName(event.target.value)}
          sx={inputSx}
        />
        <Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Frame width"
              type="number"
              variant="standard"
              value={baseFrameWidth}
              onChange={(event) => setBaseFrameWidth(Math.max(1, Number(event.target.value) || 1))}
              slotProps={{ htmlInput: { min: 1 } }}
              sx={inputSx}
            />
            <TextField
              label="Frame height"
              type="number"
              variant="standard"
              value={baseFrameHeight}
              onChange={(event) => setBaseFrameHeight(Math.max(1, Number(event.target.value) || 1))}
              slotProps={{ htmlInput: { min: 1 } }}
              sx={inputSx}
            />
          </Box>
          <Typography sx={{ fontSize: 10, color: '#6a737d', mt: 0.75 }}>
            Smallest grid unit dimensions. Larger frames span multiple units.
          </Typography>
        </Box>
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

      {/* Right: preview */}
      <Box
        ref={previewRef}
        sx={{
          flex: 1,
          background: '#080c12',
          backgroundImage: `
            linear-gradient(45deg, #0d1118 25%, transparent 25%),
            linear-gradient(-45deg, #0d1118 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #0d1118 75%),
            linear-gradient(-45deg, transparent 75%, #0d1118 75%)
          `,
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          p: 3,
        }}
      >
        {!imageUrl ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, opacity: 0.35 }}>
            <ImageIcon sx={{ fontSize: 48, color: '#6a737d' }} />
            <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: '#6a737d' }}>Upload a PNG to preview</Typography>
          </Box>
        ) : (
          <Box
            sx={{
              position: 'relative',
              width: imageNaturalWidth,
              height: imageNaturalHeight,
              transform: `scale(${previewScale})`,
              transformOrigin: 'center center',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src={imageUrl}
              alt=""
              sx={{
                display: 'block',
                width: imageNaturalWidth,
                height: imageNaturalHeight,
                imageRendering: 'pixelated',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                backgroundImage: `
                  repeating-linear-gradient(to right, rgba(56,139,253,0.25) 0 1px, transparent 1px 100%),
                  repeating-linear-gradient(to bottom, rgba(56,139,253,0.25) 0 1px, transparent 1px 100%)
                `,
                backgroundSize: `${baseFrameWidth}px ${baseFrameHeight}px`,
              }}
            />
          </Box>
        )}

        {imageUrl && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              px: 1.5,
              py: 0.75,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              gap: 2,
              borderTop: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <Typography sx={{ fontSize: 11, color: '#8b949e' }}>
              Sheet: {imageNaturalWidth}×{imageNaturalHeight}px
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#8b949e' }}>
              Grid: {baseFrameWidth}×{baseFrameHeight}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#8b949e' }}>
              Cells: {columns}×{rows} = {columns * rows}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
