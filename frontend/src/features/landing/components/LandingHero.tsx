import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { TileMapPreview } from './TileMapPreview'
import { authTokens as auth } from '../../../app/theme'

const chipSx = {
  background: auth.surface,
  border: `1px solid ${auth.border}`,
  borderRadius: '20px',
  padding: '3px 11px',
  fontSize: '10px',
  color: auth.text.muted,
  display: 'inline-block',
}

export function LandingHero() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
        minHeight: '480px',
      }}
    >
      <Box
        sx={{
          padding: '52px 36px 40px 36px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <Typography sx={{ fontSize: '10px', color: auth.accent, letterSpacing: '0.16em' }}>
          TILE GAME EDITOR
        </Typography>

        <Typography
          component="h1"
          sx={{
            fontSize: '42px',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.025em',
            color: '#e6edf3',
            margin: 0,
          }}
        >
          Build worlds.
          <br />
          <Box component="span" sx={{ color: auth.accent }}>Ship</Box> games.
        </Typography>

        <Typography
          sx={{
            fontSize: '12px',
            color: auth.text.muted,
            lineHeight: 1.75,
            maxWidth: '290px',
          }}
        >
          A browser-based tile map editor with layered painting, event placement, tileset
          management, and project-scoped organization. Built for indie devs who want to move fast.
        </Typography>

        <Box sx={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Box
            component="button"
            type="button"
            onClick={() => navigate('/register')}
            sx={{
              background: auth.accent,
              border: `1px solid ${auth.accent}`,
              color: '#fff',
              padding: '8px 20px',
              fontSize: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': {
                background: '#1a5ac8',
              },
            }}
          >
            Open editor →
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => navigate('/login')}
            sx={{
              background: 'transparent',
              border: `1px solid ${auth.border}`,
              color: '#e6edf3',
              padding: '8px 16px',
              fontSize: '12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              '&:hover': {
                borderColor: 'rgba(255,255,255,0.22)',
                background: auth.surface,
              },
            }}
          >
            Sign in
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Box component="span" sx={chipSx}>Projects</Box>
          <Box component="span" sx={chipSx}>Layered maps</Box>
          <Box component="span" sx={chipSx}>Tilesets</Box>
          <Box component="span" sx={chipSx}>Event system</Box>
          <Box
            component="span"
            sx={{
              ...chipSx,
              color: '#e8a832',
              borderColor: 'rgba(232,168,50,0.3)',
            }}
          >
            Spring Boot API
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          padding: '32px 40px 32px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '480px',
        }}
      >
        <TileMapPreview />
      </Box>
    </Box>
  )
}
