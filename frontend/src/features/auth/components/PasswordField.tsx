import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { authTokens as auth } from '../../../app/theme'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import { useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'

type PasswordFieldProps = {
  id: string
  name: string
  value: string
  autoComplete?: string
  label: string
  error?: string | null
  onChange: (value: string) => void
}

export function PasswordField({ id, name, value, autoComplete, label, error, onChange }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Box>
      <FieldLabel htmlFor={id}>{label}<Box component="span" sx={{ color: auth.accent }}> *</Box></FieldLabel>
      <Box sx={{ position: 'relative' }}>
        <FieldInput
          id={id}
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          autoComplete={autoComplete}
          onChange={onChange}
          sx={{ paddingRight: '40px' }}
        />
        <Box
          component="button"
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          sx={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            color: auth.text.muted,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {showPassword ? <VisibilityOffIcon sx={{ fontSize: '15px' }} /> : <VisibilityIcon sx={{ fontSize: '15px' }} />}
        </Box>
      </Box>
      {error ? <FieldError>{error}</FieldError> : null}
    </Box>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <Box
      component="label"
      htmlFor={htmlFor}
      sx={{
        fontSize: '10px',
        color: auth.text.muted,
        display: 'block',
        marginBottom: '6px',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </Box>
  )
}

export function FieldInput({
  id,
  type,
  name,
  value,
  autoComplete,
  placeholder,
  autoFocus,
  onChange,
  sx,
}: {
  id: string
  type: string
  name: string
  value: string
  autoComplete?: string
  placeholder?: string
  autoFocus?: boolean
  onChange: (value: string) => void
  sx?: SxProps<Theme>
}) {
  return (
    <Box
      component="input"
      id={id}
      type={type}
      name={name}
      value={value}
      autoComplete={autoComplete}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      sx={{
        width: '100%',
        background: auth.surface,
        border: `1px solid ${auth.border}`,
        borderRadius: '8px',
        padding: '10px 14px',
        color: '#e6edf3',
        fontFamily: 'inherit',
        fontSize: '12px',
        outline: 'none',
        display: 'block',
        transition: 'border-color 150ms, box-shadow 150ms',
        '&:focus': {
          borderColor: auth.accent,
          boxShadow: '0 0 0 3px rgba(56,139,253,0.18)',
        },
        '&::placeholder': {
          color: '#6a737d',
        },
        ...sx,
      }}
    />
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ color: '#ff9080', fontSize: '10px', mt: '6px' }}>
      {children}
    </Box>
  )
}
