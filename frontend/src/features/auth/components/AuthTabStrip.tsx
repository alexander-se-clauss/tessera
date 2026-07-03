import { Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { authTokens as auth } from '../../../app/theme'

type AuthTabStripProps = {
  active: 'login' | 'register'
}

export function AuthTabStrip({ active }: AuthTabStripProps) {
  const navigate = useNavigate()

  return (
    <Box sx={{ display: 'flex', gap: '8px', marginBottom: '22px' }}>
      <TabButton active={active === 'login'} label="Sign in" onClick={() => navigate('/login')} />
      <TabButton active={active === 'register'} label="Register" onClick={() => navigate('/register')} />
    </Box>
  )
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        flex: 1,
        background: active ? auth.accent : 'transparent',
        border: active ? `1px solid ${auth.accent}` : `1px solid ${auth.border}`,
        color: active ? '#fff' : '#e6edf3',
        fontWeight: active ? 700 : 400,
        borderRadius: '6px',
        padding: '7px',
        fontSize: '11px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        '&:hover': active
          ? { background: auth.accent }
          : {
              borderColor: 'rgba(255,255,255,0.22)',
              background: auth.surface,
            },
      }}
    >
      {label}
    </Box>
  )
}
