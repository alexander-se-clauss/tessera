import { Box, IconButton, Typography } from '@mui/material'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { useEffect, useRef, useState } from 'react'
import type { SpriteFrame } from '../types/sprite'
import { useAnimationPlayer } from '../hooks/useAnimationPlayer'

type AnimationPreviewProps = {
  imageUrl: string
  frames: SpriteFrame[]
  baseFrameWidth: number
  baseFrameHeight: number
  stateName: string
}

export function AnimationPreview({
  imageUrl,
  frames,
  baseFrameWidth,
  baseFrameHeight,
  stateName,
}: AnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)

  const { playing, setPlaying } = useAnimationPlayer(frames, imageEl, canvasRef, {
    baseFrameWidth,
    baseFrameHeight,
    displayScale: 2,
  })

  useEffect(() => {
    const image = new Image()
    image.onload = () => setImageEl(image)
    image.src = imageUrl
  }, [imageUrl])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75, width: 128 }}>
      <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 10, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: 1 }}>
          {stateName}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setPlaying((value) => !value)}
          sx={{
            width: 28,
            height: 28,
            flexShrink: 0,
            color: playing ? '#79b8ff' : '#e6edf3',
            background: 'rgba(13,17,23,0.92)',
            border: '1px solid rgba(255,255,255,0.16)',
            borderRadius: '7px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
            '&:hover': {
              color: '#ffffff',
              background: 'rgba(22,27,34,0.98)',
            },
          }}
        >
          {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
        </IconButton>
      </Box>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 128,
          overflow: 'hidden',
          background: '#090d13',
          backgroundImage: `
            linear-gradient(45deg, #0f131a 25%, transparent 25%),
            linear-gradient(-45deg, #0f131a 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #0f131a 75%),
            linear-gradient(-45deg, transparent 75%, #0f131a 75%)
          `,
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              imageRendering: 'pixelated',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        </Box>
      </Box>
    </Box>
  )
}
