import CheckIcon from '@mui/icons-material/Check'
import { Box } from '@mui/material'
import type { TilesetImportStepperProps } from './types'

const STEPS = ['Extract', 'Organize & Collision', 'Review']

export function TilesetImportStepper({ step }: TilesetImportStepperProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        pointerEvents: 'none',
      }}
    >
      {STEPS.map((label, i) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              transition: 'all 200ms ease',
              ...(i < step
                ? { bgcolor: 'rgba(56,139,253,0.15)', border: '1px solid rgba(56,139,253,0.32)', color: '#5d9eff' }
                : i === step
                  ? { bgcolor: 'rgba(93,158,255,0.14)', border: '1px solid rgba(93,158,255,0.38)', color: '#79b8ff' }
                  : { bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }),
            }}
          >
            {i < step ? <CheckIcon sx={{ fontSize: 10, color: '#5d9eff' }} /> : i + 1}
          </Box>
          <Box
            sx={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: i === step ? '180px' : '0px',
              opacity: i === step ? 1 : 0,
              pl: i === step ? 0.75 : 0,
              transition: 'max-width 250ms ease, opacity 250ms ease',
              fontSize: 11,
              fontWeight: 500,
              color: '#8b949e',
              letterSpacing: '0.04em',
            }}
          >
            {label}
          </Box>
        </Box>
      ))}
    </Box>
  )
}
