import { Box, Typography } from '@mui/material'
import { SpriteFrameCanvas } from './SpriteFrameCanvas'
import type { SpriteFrameSource } from './types'

type MovementPreviewStripProps = {
  frames: SpriteFrameSource[]
  speed: number
}

export function MovementPreviewStrip({ frames, speed }: MovementPreviewStripProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flex: 1, minWidth: 0 }}>
          {frames.map((frame, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                <SpriteFrameCanvas frame={frame} scale={3.5} />
              </Box>
              {index < frames.length - 1 ? (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(93,158,255,0.32)' }} />
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(93,158,255,0.22)' }} />
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(93,158,255,0.14)' }} />
                </Box>
              ) : null}
            </Box>
          ))}
        </Box>
        <Box
          sx={{
            width: 120,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
          }}
        >
          <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.5)' }}>Speed</Typography>
          <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'rgba(240,245,255,0.94)' }}>
            {speed.toFixed(1)} tiles/s
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
