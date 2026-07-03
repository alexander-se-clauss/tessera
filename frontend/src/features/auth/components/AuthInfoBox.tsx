import { Box, Typography } from '@mui/material'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { authTokens as auth } from '../../../app/theme'

type AuthInfoBoxProps = {
  text: string
}

export function AuthInfoBox({ text }: AuthInfoBoxProps) {
  return (
    <Box
      sx={{
        mt: '18px',
        padding: '11px 14px',
        background: 'rgba(56,139,253,0.10)',
        borderRadius: '8px',
        border: '1px solid rgba(56,139,253,0.25)',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
      }}
    >
      <InfoOutlinedIcon sx={{ fontSize: '15px', color: auth.accent, flexShrink: 0, mt: '1px' }} />
      <Typography sx={{ fontSize: '11px', color: '#79b8ff', lineHeight: 1.5 }}>
        {text}
      </Typography>
    </Box>
  )
}
