import { Box, Typography } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { authTokens as auth } from '../../../app/theme'

const navLinkSx = {
  fontSize: '11px',
  color: auth.text.muted,
  padding: '4px 10px',
  cursor: 'pointer',
  transition: 'color 120ms ease',
  '&:hover': {
    color: '#e6edf3',
  },
}

const ghostButtonSx = {
  background: 'transparent',
  border: `1px solid ${auth.border}`,
  color: '#e6edf3',
  borderRadius: '6px',
  padding: '4px 13px',
  fontSize: '11px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 'normal',
  transition: 'border-color 120ms ease, background-color 120ms ease',
  '&:hover': {
    borderColor: 'rgba(255,255,255,0.22)',
    background: auth.surface,
  },
}

export function LandingNav() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        width: '100%',
        height: '46px',
        background: '#161b22',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <Box
        component="svg"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        sx={{ flexShrink: 0 }}
      >
        <rect x="1" y="1" width="8" height="8" rx="2" fill="#388bfd" />
        <rect x="11" y="1" width="8" height="8" rx="2" fill="#3d8a4e" />
        <rect x="1" y="11" width="8" height="8" rx="2" fill="#e8a832" />
        <rect x="11" y="11" width="8" height="8" rx="2" fill="#388bfd" opacity="0.35" />
      </Box>

      <Typography
        sx={{
          fontSize: '14px',
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: '#e6edf3',
          marginRight: '18px',
        }}
      >
        TileCraft
      </Typography>

      <Box component="span" sx={navLinkSx}>Features</Box>
      <Box component="span" sx={navLinkSx}>Docs</Box>
      <Box component="span" sx={navLinkSx}>Changelog</Box>

      <Box sx={{ flex: 1 }} />

      <Box sx={{ display: 'flex', gap: '6px' }}>
        <Box component="button" type="button" sx={ghostButtonSx} onClick={() => navigate('/')}>
          Home
        </Box>
        <Box component="button" type="button" sx={ghostButtonSx} onClick={() => navigate('/login')}>
          Sign in
        </Box>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/register')}
          sx={{
            background: auth.accent,
            border: `1px solid ${auth.accent}`,
            color: '#fff',
            borderRadius: '6px',
            padding: '4px 13px',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            lineHeight: 'normal',
            transition: 'background-color 120ms ease',
            '&:hover': {
              background: '#1a5ac8',
            },
          }}
        >
          Get started
        </Box>
      </Box>
    </Box>
  )
}
