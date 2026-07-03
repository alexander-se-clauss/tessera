import { Box, Typography } from '@mui/material'
import LayersIcon from '@mui/icons-material/Layers'
import { authTokens as auth } from '../../../app/theme'
import TableChartIcon from '@mui/icons-material/TableChart'
import BoltIcon from '@mui/icons-material/Bolt'

const featureCardSx = {
  background: auth.bg,
  padding: '26px 28px',
}

export function LandingFeatures() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(255,255,255,0.07)',
        gap: '1px',
      }}
    >
      <Box sx={featureCardSx}>
        <LayersIcon sx={{ fontSize: '20px', color: auth.accent, display: 'block', mb: '10px' }} />
        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3', mb: '6px' }}>
          Layered editing
        </Typography>
        <Typography sx={{ fontSize: '11px', color: auth.text.muted, lineHeight: 1.65 }}>
          Background, foreground, collision, and event layers. Paint tiles independently. Toggle
          visibility per layer.
        </Typography>
      </Box>

      <Box sx={featureCardSx}>
        <TableChartIcon sx={{ fontSize: '20px', color: auth.success, display: 'block', mb: '10px' }} />
        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3', mb: '6px' }}>
          Tileset management
        </Typography>
        <Typography sx={{ fontSize: '11px', color: auth.text.muted, lineHeight: 1.65 }}>
          Register tilesets by URL. Visual tile palette. Switch tilesets per project. Columns,
          rows, margin, spacing.
        </Typography>
      </Box>

      <Box sx={featureCardSx}>
        <BoltIcon sx={{ fontSize: '20px', color: '#e8a832', display: 'block', mb: '10px' }} />
        <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#e6edf3', mb: '6px' }}>
          Event system
        </Typography>
        <Typography sx={{ fontSize: '11px', color: auth.text.muted, lineHeight: 1.65 }}>
          Place NPC, warp, trigger, door, item, and script events on tiles. Attach free-form JSON
          properties.
        </Typography>
      </Box>
    </Box>
  )
}
