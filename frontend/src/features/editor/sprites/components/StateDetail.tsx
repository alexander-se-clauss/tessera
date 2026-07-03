import { Box, IconButton, TextField, Tooltip, Typography } from '@mui/material'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import CloseIcon from '@mui/icons-material/Close'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import { useEffect, useRef, useState } from 'react'
import type { SpriteFrame, SpriteState } from '../types/sprite'
import { getSpriteFrameSourceRect } from '../types/sprite'
import { useAnimationPlayer } from '../hooks/useAnimationPlayer'
import { applyColorRemoval } from '../utils/colorRemoval'

const fieldSx = {
  width: '100%',
  '& .MuiInputBase-root': {
    height: 36,
    color: 'rgba(240,245,255,0.9)',
    fontSize: 14,
    fontWeight: 500,
  },
  '& .MuiInputBase-input': {
    textAlign: 'right' as const,
    py: 0.5,
  },
  '& .MuiInput-underline:before': {
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
    borderBottomColor: 'rgba(255,255,255,0.22)',
  },
  '& .MuiInput-underline:after': {
    borderBottomColor: '#5d9eff',
  },
}

const stepperButtonSx = {
  p: 0,
  minWidth: 0,
  width: 16,
  height: 16,
  color: 'rgba(220,230,245,0.48)',
  '&:hover': {
    color: '#e6edf3',
    background: 'transparent',
  },
}

type StateDetailProps = {
  imageUrl: string
  baseFrameWidth: number
  baseFrameHeight: number
  activeState: SpriteState | null
  blockedColors: string[]
  onRemoveBlockedColor: (color: string) => void
  onRemoveFrame: (stateId: string, frameIndex: number) => void
  onUpdateFrame: (stateId: string, frameIndex: number, updates: Partial<SpriteFrame>) => void
  onCurrentFrameIndexChange?: (stateId: string, index: number) => void
}

type TimelineFrameProps = {
  frame: SpriteFrame
  index: number
  currentFrameIndex: number
  baseFrameWidth: number
  baseFrameHeight: number
  imageEl: HTMLImageElement | null
  blockedColors: string[]
  onSetCurrentFrameIndex: (index: number) => void
}

function drawThumb(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement | null,
  frame: SpriteFrame,
  baseFrameWidth: number,
  baseFrameHeight: number,
  blockedColors: string[] = [],
) {
  if (!canvas || !image) {
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const src = getSpriteFrameSourceRect(frame, baseFrameWidth, baseFrameHeight)
  canvas.width = src.width
  canvas.height = src.height
  ctx.clearRect(0, 0, src.width, src.height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height)
  applyColorRemoval(ctx, src.width, src.height, blockedColors)
}

function TimelineFrame({
  frame,
  index,
  currentFrameIndex,
  baseFrameWidth,
  baseFrameHeight,
  imageEl,
  blockedColors,
  onSetCurrentFrameIndex,
}: TimelineFrameProps) {
  const selected = currentFrameIndex === index

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
      <Box
        onClick={() => onSetCurrentFrameIndex(index)}
        sx={{
          width: 44,
          height: 44,
          flexShrink: 0,
          border: selected ? '1px solid rgba(93,158,255,0.5)' : '1px solid rgba(255,255,255,0.06)',
          borderRadius: '4px',
          overflow: 'hidden',
          background: selected ? 'rgba(93,158,255,0.10)' : 'transparent',
          cursor: 'pointer',
          imageRendering: 'pixelated',
          display: 'grid',
          placeItems: 'center',
          transition: 'all 120ms ease',
          '&:hover': {
            background: selected ? 'rgba(93,158,255,0.14)' : 'rgba(255,255,255,0.05)',
          },
        }}
      >
        <canvas
          ref={(element) => {
            if (element && imageEl) {
              drawThumb(element, imageEl, frame, baseFrameWidth, baseFrameHeight, blockedColors)
            }
          }}
          style={{ display: 'block', width: 32, height: 32, imageRendering: 'pixelated' }}
        />
      </Box>
      <Typography sx={{ fontSize: 12, lineHeight: 1.3, color: selected ? '#5d9eff' : '#6a737d' }}>
        {index + 1}
      </Typography>
    </Box>
  )
}

function clampOffset(value: number) {
  return Math.max(-15, Math.min(15, value))
}

export function StateDetail({
  imageUrl,
  baseFrameWidth,
  baseFrameHeight,
  activeState,
  blockedColors,
  onRemoveBlockedColor,
  onRemoveFrame,
  onUpdateFrame,
  onCurrentFrameIndexChange,
}: StateDetailProps) {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)

  const { playing, setPlaying, currentIndex, setCurrentIndex } = useAnimationPlayer(
    activeState?.frames ?? [],
    imageEl,
    previewCanvasRef,
    {
      baseFrameWidth,
      baseFrameHeight,
      displayScale: 2,
      blockedColors,
    },
  )

  useEffect(() => {
    if (activeState && onCurrentFrameIndexChange) {
      onCurrentFrameIndexChange(activeState.id, currentIndex)
    }
  }, [activeState, currentIndex, onCurrentFrameIndexChange])

  useEffect(() => {
    if (!imageUrl) {
      setImageEl(null)
      return
    }

    const image = new Image()
    image.onload = () => setImageEl(image)
    image.src = imageUrl
  }, [imageUrl])

  useEffect(() => {
    setCurrentIndex(0)
    setPlaying(false)
  }, [activeState?.id, setCurrentIndex, setPlaying])

  useEffect(() => {
    if (!activeState) {
      return
    }
    if (activeState.frames.length === 0) {
      setCurrentIndex(0)
      return
    }
    if (currentIndex >= activeState.frames.length) {
      setCurrentIndex(activeState.frames.length - 1)
    }
  }, [activeState, currentIndex, setCurrentIndex])

  if (!activeState) {
    return (
      <Box
        sx={{
          minHeight: 0,
          borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}
      />
    )
  }

  const selectedFrame = activeState.frames[currentIndex] ?? null

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
        flexShrink: 0,
        borderLeft: '1px solid rgba(255,255,255,0.06)',
        pl: 2,
        pr: 2.5,
        py: 1.75,
        gap: 1.75,
      }}
    >
      <Box
        sx={{
          minHeight: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, color: '#c9d1d9', letterSpacing: '0.01em' }}>
          {activeState.name ?? '—'}
        </Typography>
        <IconButton size="small" sx={{ color: '#6a737d', '&:hover': { color: '#e6edf3', background: 'transparent' } }}>
          <MoreHorizIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.35 }}>
          State preview
        </Typography>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: 130,
            overflow: 'hidden',
            flexShrink: 0,
            background: '#080c12',
            backgroundImage: `
              linear-gradient(45deg, #0d1118 25%, transparent 25%),
              linear-gradient(-45deg, #0d1118 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #0d1118 75%),
              linear-gradient(-45deg, transparent 75%, #0d1118 75%)
            `,
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
            borderRadius: '2px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Tooltip title="Play animation">
            <IconButton
              size="small"
              onClick={() => setPlaying((value) => !value)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                p: 0.375,
                color: playing ? '#79b8ff' : '#8b949e',
                '&:hover': { color: '#e6edf3', background: 'transparent' },
              }}
            >
              {playing ? <PauseIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
          <canvas
            ref={previewCanvasRef}
            style={{
              display: 'block',
              imageRendering: 'pixelated',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 0.75 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.35 }}>
          Animation
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            px: 0.75,
            pb: 0,
            minHeight: 72,
            '&::-webkit-scrollbar': { height: 3 },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255,255,255,0.12)',
              borderRadius: 999,
            },
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255,255,255,0.12) transparent',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <IconButton
              size="small"
              onClick={() => setPlaying((value) => !value)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: '4px',
                bgcolor: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: playing ? '#5d9eff' : '#8b949e',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', color: '#c9d1d9' },
              }}
            >
              {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
            </IconButton>
            <Typography sx={{ fontSize: 12, lineHeight: 1.3, color: '#6a737d' }}>Play</Typography>
          </Box>

          {activeState.frames.map((frame, index) => (
            <TimelineFrame
              key={index}
              frame={frame}
              index={index}
              currentFrameIndex={currentIndex}
              baseFrameWidth={baseFrameWidth}
              baseFrameHeight={baseFrameHeight}
              imageEl={imageEl}
              blockedColors={blockedColors}
              onSetCurrentFrameIndex={setCurrentIndex}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.35 }}>
            Frame settings
          </Typography>
          {selectedFrame && (
            <Tooltip title="Delete frame">
              <IconButton
                size="small"
                onClick={() => onRemoveFrame(activeState.id, currentIndex)}
                sx={{ color: '#6a737d', '&:hover': { color: '#e84b4a', background: 'rgba(255,255,255,0.04)' } }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        {selectedFrame ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: '68px minmax(0, 1fr) 24px', columnGap: 1.25, rowGap: 0.75, alignItems: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'rgba(220,230,245,0.68)' }}>Duration</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 16px', alignItems: 'end', columnGap: 0.5 }}>
              <TextField
                variant="standard"
                size="small"
                type="number"
                value={selectedFrame.duration}
                onChange={(event) => onUpdateFrame(activeState.id, currentIndex, { duration: Math.max(1, Number(event.target.value) || 1) })}
                slotProps={{
                  htmlInput: {
                    min: 1,
                    max: 9999,
                  },
                }}
                sx={fieldSx}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', mb: '1px' }}>
                <IconButton
                  size="small"
                  onClick={() => onUpdateFrame(activeState.id, currentIndex, { duration: selectedFrame.duration + 1 })}
                  sx={stepperButtonSx}
                >
                  <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onUpdateFrame(activeState.id, currentIndex, { duration: Math.max(1, selectedFrame.duration - 1) })}
                  sx={stepperButtonSx}
                >
                  <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            </Box>
            <Typography sx={{ fontSize: 13, color: 'rgba(220,230,245,0.52)' }}>ms</Typography>

            <Typography sx={{ fontSize: 13, color: 'rgba(220,230,245,0.68)' }}>Offset</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1.25, alignItems: 'end' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 16px', alignItems: 'end', columnGap: 0.5 }}>
                <TextField
                  variant="standard"
                  size="small"
                  type="number"
                  value={selectedFrame.offsetX}
                  onChange={(event) => onUpdateFrame(activeState.id, currentIndex, { offsetX: clampOffset(Number(event.target.value) || 0) })}
                  slotProps={{
                    htmlInput: {
                      min: -15,
                      max: 15,
                    },
                  }}
                  sx={fieldSx}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', mb: '1px' }}>
                  <IconButton
                    size="small"
                    onClick={() => onUpdateFrame(activeState.id, currentIndex, { offsetX: clampOffset(selectedFrame.offsetX + 1) })}
                    sx={stepperButtonSx}
                  >
                    <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onUpdateFrame(activeState.id, currentIndex, { offsetX: clampOffset(selectedFrame.offsetX - 1) })}
                    sx={stepperButtonSx}
                  >
                    <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 16px', alignItems: 'end', columnGap: 0.5 }}>
                <TextField
                  variant="standard"
                  size="small"
                  type="number"
                  value={selectedFrame.offsetY}
                  onChange={(event) => onUpdateFrame(activeState.id, currentIndex, { offsetY: clampOffset(Number(event.target.value) || 0) })}
                  slotProps={{
                    htmlInput: {
                      min: -15,
                      max: 15,
                    },
                  }}
                  sx={fieldSx}
                />
                <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', mb: '1px' }}>
                  <IconButton
                    size="small"
                    onClick={() => onUpdateFrame(activeState.id, currentIndex, { offsetY: clampOffset(selectedFrame.offsetY + 1) })}
                    sx={stepperButtonSx}
                  >
                    <KeyboardArrowUpIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onUpdateFrame(activeState.id, currentIndex, { offsetY: clampOffset(selectedFrame.offsetY - 1) })}
                    sx={stepperButtonSx}
                  >
                    <KeyboardArrowDownIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              </Box>
            </Box>
            <Box />
          </Box>
        ) : (
          <Box sx={{ minHeight: 8 }} />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 0.75 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.35 }}>
          Color removal
        </Typography>
        {blockedColors.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.42)', lineHeight: 1.45 }}>
            No colors removed.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25 }}>
            {blockedColors.map((color) => (
              <Tooltip key={color} title={`Unblock ${color}`}>
                <Box
                  onClick={() => onRemoveBlockedColor(color)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    height: 32,
                    px: 0.875,
                    borderRadius: '4px',
                    bgcolor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.1)' },
                  }}
                >
                  <Box sx={{ width: 20, height: 20, bgcolor: color, borderRadius: '6px', border: '1px solid rgba(255,255,255,0.18)', flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, color: '#8b949e', lineHeight: 1.35 }}>
                    {color}
                  </Typography>
                  <CloseIcon sx={{ fontSize: 12, color: '#6a737d' }} />
                </Box>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}
