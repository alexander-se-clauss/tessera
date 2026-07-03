import { Box } from '@mui/material'
import { authTokens as auth } from '../../../app/theme'

export const submitButtonSx = {
  display: 'grid',
  placeItems: 'center',
  width: '100%',
  background: auth.accent,
  border: 'none',
  color: '#fff',
  padding: '11px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  transition: 'background 150ms',
  minHeight: '41px',
  '&:hover': {
    background: '#1a5ac8',
  },
  '&:disabled': {
    opacity: 0.72,
    cursor: 'default',
  },
}

export function FooterLink({ prefix, action, onClick }: { prefix: string; action: string; onClick: () => void }) {
  return (
    <Box sx={{ marginTop: '20px', textAlign: 'center', fontSize: '11px', color: auth.text.muted }}>
      {prefix}{' '}
      <Box component="span" onClick={onClick} sx={{ color: auth.accent, cursor: 'pointer' }}>
        {action}
      </Box>
    </Box>
  )
}
