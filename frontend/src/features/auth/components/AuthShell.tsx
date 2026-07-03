import { Box } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { authTokens as auth } from '../../../app/theme'

type AuthShellProps = {
  children: ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        bgcolor: auth.bg,
        color: '#e6edf3',
        minHeight: '100vh',
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Mono', monospace",
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ padding: '20px 24px 6px', display: 'flex' }}>
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/')}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: auth.text.muted,
            fontSize: '11px',
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            fontFamily: 'inherit',
            padding: 0,
            '&:hover': {
              color: '#e6edf3',
            },
          }}
        >
          <ArrowBackIcon sx={{ fontSize: '14px' }} />
          Back
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '32px 24px 64px' }}>
        <Box
          sx={{
            background: '#161b22',
            border: `1px solid ${auth.border}`,
            borderRadius: '14px',
            padding: '36px 40px',
            width: '100%',
            maxWidth: '420px',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
