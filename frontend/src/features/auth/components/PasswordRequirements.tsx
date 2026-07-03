import { Box, Typography } from '@mui/material'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { authTokens as auth } from '../../../app/theme'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

type PasswordRequirementsProps = {
  password: string
}

export function PasswordRequirements({ password }: PasswordRequirementsProps) {
  const hasMinLength = password.length >= 8
  const hasLettersAndNumbers = /[a-zA-Z]/.test(password) && /[0-9]/.test(password)

  return (
    <Box
      sx={{
        padding: '11px 14px',
        background: auth.surface,
        borderRadius: '8px',
        border: `1px solid ${auth.border}`,
      }}
    >
      <Typography sx={{ fontSize: '10px', color: '#6a737d', marginBottom: '8px', letterSpacing: '0.06em' }}>
        PASSWORD REQUIREMENTS
      </Typography>
      <RequirementRow label="At least 8 characters" met={hasMinLength} />
      <RequirementRow label="Letters and numbers" met={hasLettersAndNumbers} />
    </Box>
  )
}

function RequirementRow({ label, met }: { label: string; met: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: met ? auth.success : auth.text.muted, '& + &': { mt: '6px' } }}>
      {met ? <CheckCircleIcon sx={{ fontSize: '10px', color: auth.success }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: '10px' }} />}
      <Typography sx={{ fontSize: '10px', color: 'inherit' }}>{label}</Typography>
    </Box>
  )
}
