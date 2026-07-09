import CropFreeRoundedIcon from '@mui/icons-material/CropFreeRounded'
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded'
import RadioButtonCheckedRoundedIcon from '@mui/icons-material/RadioButtonCheckedRounded'
import { Box, IconButton, Typography } from '@mui/material'
import { SpriteFrameCanvas } from './SpriteFrameCanvas'
import type { SpriteFrameSource } from './types'

type PlayerPreviewPanelProps = {
  frame: SpriteFrameSource | null
  collisionBox: {
    width: number
    height: number
    offsetX: number
    offsetY: number
  }
  showGrid: boolean
  onToggleGrid: () => void
}

function Handle({ left, top }: { left: string; top: string }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left,
        top,
        width: 10,
        height: 10,
        borderRadius: 0.5,
        bgcolor: '#5d9eff',
        border: '2px solid rgba(13,18,26,0.9)',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 0 1px rgba(93,158,255,0.25)',
      }}
    />
  )
}

export function PlayerPreviewPanel({ frame, collisionBox, showGrid, onToggleGrid }: PlayerPreviewPanelProps) {
  const scale = frame ? Math.max(3, Math.floor(144 / Math.max(frame.frameW, frame.frameH))) : 6
  const frameWidthPx = (frame?.frameW ?? 16) * scale
  const frameHeightPx = (frame?.frameH ?? 16) * scale
  const boxLeft = collisionBox.offsetX * scale
  const boxTop = collisionBox.offsetY * scale
  const boxWidth = collisionBox.width * scale
  const boxHeight = collisionBox.height * scale

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              minWidth: 64,
              px: 1.25,
              py: 0.75,
              borderRadius: 1.25,
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              fontSize: 12,
              color: 'rgba(240,245,255,0.88)',
              textAlign: 'center',
            }}
          >
            {frame ? `${frame.frameW}×${frame.frameH}` : '16×16'}
          </Box>
          <IconButton
            size="small"
            onClick={onToggleGrid}
            sx={{
              width: 34,
              height: 34,
              color: showGrid ? '#79b8ff' : 'rgba(220,230,245,0.72)',
              background: showGrid ? 'rgba(93,158,255,0.14)' : 'rgba(255,255,255,0.03)',
              border: '1px solid',
              borderColor: showGrid ? 'rgba(93,158,255,0.24)' : 'rgba(255,255,255,0.05)',
              '&:hover': {
                background: showGrid ? 'rgba(93,158,255,0.22)' : 'rgba(255,255,255,0.05)',
              },
            }}
          >
            <GridOnRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              width: 34,
              height: 34,
              color: 'rgba(220,230,245,0.72)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <CropFreeRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      <Box
        sx={{
          position: 'relative',
          minHeight: 292,
          flex: 1,
          borderRadius: 2.5,
          overflow: 'hidden',
          background: `
            radial-gradient(circle at 50% 10%, rgba(93,158,255,0.14), transparent 32%),
            linear-gradient(180deg, rgba(10,14,20,0.98), rgba(8,12,18,0.98))
          `,
          border: '1px solid rgba(255,255,255,0.04)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: showGrid ? 1 : 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
            transition: 'opacity 140ms ease',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 4,
            py: 4,
          }}
        >
          <Box sx={{ position: 'relative', width: frameWidthPx, height: frameHeightPx }}>
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '170%',
                height: 1,
                borderTop: '1px dashed rgba(93,158,255,0.35)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: 1,
                height: '170%',
                borderLeft: '1px dashed rgba(93,158,255,0.35)',
              }}
            />
            <Box sx={{ position: 'absolute', top: -12, left: -12, display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <RadioButtonCheckedRoundedIcon sx={{ fontSize: 12, color: '#5d9eff' }} />
              <Typography sx={{ fontSize: 11, color: 'rgba(160,196,245,0.72)' }}>
                Origin (0,0)
              </Typography>
            </Box>

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SpriteFrameCanvas frame={frame} scale={scale} />
            </Box>

            <Box
              sx={{
                position: 'absolute',
                left: boxLeft,
                top: boxTop,
                width: boxWidth,
                height: boxHeight,
                border: '2px solid #5d9eff',
                boxShadow: '0 0 0 1px rgba(10,14,20,0.9), 0 0 0 5px rgba(93,158,255,0.12)',
                bgcolor: 'rgba(93,158,255,0.08)',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 12,
                  height: 12,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, bgcolor: '#5d9eff', transform: 'translateX(-50%)' }} />
                <Box sx={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, bgcolor: '#5d9eff', transform: 'translateY(-50%)' }} />
              </Box>
              <Handle left="0%" top="0%" />
              <Handle left="50%" top="0%" />
              <Handle left="100%" top="0%" />
              <Handle left="0%" top="50%" />
              <Handle left="100%" top="50%" />
              <Handle left="0%" top="100%" />
              <Handle left="50%" top="100%" />
              <Handle left="100%" top="100%" />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
