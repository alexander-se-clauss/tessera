import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import type { SpriteState } from '../../types/sprite'
import { TAG_COLORS } from '../../types/sprite'
import { useAnimationPlayer } from '../../hooks/useAnimationPlayer'

type ConfirmStepProps = {
  spriteName: string
  baseFrameWidth: number
  baseFrameHeight: number
  columns: number
  rows: number
  states: SpriteState[]
  imageUrl: string
  blockedColors: string[]
  frameIndexSnapshot: Record<string, number>
}

const checkerBg = {
  background: '#090d13',
  backgroundImage: `
    linear-gradient(45deg, #0f131a 25%, transparent 25%),
    linear-gradient(-45deg, #0f131a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #0f131a 75%),
    linear-gradient(-45deg, transparent 75%, #0f131a 75%)
  `,
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
}

type PreviewCardProps = {
  state: SpriteState
  initialFrameIndex: number
  imageUrl: string
  baseFrameWidth: number
  baseFrameHeight: number
  blockedColors: string[]
}

function PreviewCard({
  state,
  initialFrameIndex,
  imageUrl,
  baseFrameWidth,
  baseFrameHeight,
  blockedColors,
}: PreviewCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = imageUrl
  }, [imageUrl])

  const { playing, setPlaying, setCurrentIndex } = useAnimationPlayer(
    state.frames,
    imageEl,
    canvasRef,
    { baseFrameWidth, baseFrameHeight, displayScale: 2, blockedColors },
  )

  useEffect(() => {
    if (imageEl) {
      setCurrentIndex(initialFrameIndex)
    }
  }, [imageEl, initialFrameIndex, setCurrentIndex])

  const color = TAG_COLORS[state.tag]

  return (
    <Box
      sx={{
        border: '1px solid rgba(255,255,255,0.06)',
        borderLeft: `2px solid ${color}70`,
        borderRadius: '4px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.5,
          background: 'rgba(255,255,255,0.025)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.4,
            color: '#e6edf3',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {state.name}
        </Typography>
        <Tooltip title={playing ? 'Pause' : 'Play animation'}>
          <IconButton
            size="small"
            onClick={() => setPlaying((v) => !v)}
            sx={{
              p: 0.25,
              border: 'none',
              color: playing ? '#79b8ff' : '#8b949e',
              '&:hover': { color: '#e6edf3', background: 'transparent' },
            }}
          >
            {playing ? <PauseIcon sx={{ fontSize: 14 }} /> : <PlayArrowIcon sx={{ fontSize: 14 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          ...checkerBg,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 96,
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block', imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: 6,
            left: 6,
            bgcolor: `${color}33`,
            border: `1px solid ${color}60`,
            borderRadius: '3px',
            px: 0.75,
            py: 0.125,
            fontSize: 11,
            fontWeight: 600,
            color: color,
            lineHeight: 1.35,
          }}
        >
          {state.tag}
        </Box>
      </Box>
    </Box>
  )
}

export function ConfirmStep({
  spriteName,
  baseFrameWidth,
  baseFrameHeight,
  columns,
  rows,
  states,
  imageUrl,
  blockedColors,
  frameIndexSnapshot,
}: ConfirmStepProps) {
  const totalFrames = states.reduce((sum, s) => sum + s.frames.length, 0)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '200px minmax(0, 1fr)', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Left: metadata */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pl: 3, pr: 2.5, py: 2.5, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6a737d', mb: 1 }}>
          {spriteName}
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            columnGap: 2,
            rowGap: 0.875,
            alignItems: 'baseline',
          }}
        >
          {[
            ['Cell size', `${baseFrameWidth} × ${baseFrameHeight} px`],
            ['Grid', `${columns} × ${rows}`],
            ['States', String(states.length)],
            ['Total frames', String(totalFrames)],
          ].map(([label, value]) => (
            <Box key={label} sx={{ display: 'contents' }}>
              <Typography sx={{ fontSize: 11, lineHeight: 1.5, color: '#6a737d' }}>{label}</Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.5, color: '#c9d1d9', fontWeight: 500, wordBreak: 'break-all' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Right: card grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 1.25,
          alignContent: 'start',
          overflowY: 'auto',
          p: 2,
        }}
      >
        {states.map((state) => (
          <PreviewCard
            key={state.id}
            state={state}
            initialFrameIndex={frameIndexSnapshot[state.id] ?? 0}
            imageUrl={imageUrl}
            baseFrameWidth={baseFrameWidth}
            baseFrameHeight={baseFrameHeight}
            blockedColors={blockedColors}
          />
        ))}
      </Box>
    </Box>
  )
}
