import { Box } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined'

type AuthErrorBoxProps = {
  error: string
}

export function AuthErrorBox({ error }: AuthErrorBoxProps) {
  return (
    <Box
      sx={{
        padding: '10px 14px',
        background: 'rgba(232,72,50,0.12)',
        border: '1px solid rgba(232,72,50,0.35)',
        borderRadius: '8px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        color: '#ff9080',
        fontSize: '11px',
        lineHeight: 1.5,
      }}
    >
      <ErrorOutlineIcon sx={{ fontSize: '15px', color: '#ff9080', flexShrink: 0 }} />
      <Box>{error}</Box>
    </Box>
  )
}
