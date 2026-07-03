import { Box, CircularProgress, Typography } from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../app/hooks'
import { AuthErrorBox } from '../components/AuthErrorBox'
import { AuthShell } from '../components/AuthShell'
import { AuthTabStrip } from '../components/AuthTabStrip'
import { FieldError, FieldInput, FieldLabel } from '../components/PasswordField'
import { FooterLink, submitButtonSx } from '../components/AuthFormElements'
import { PasswordRequirements } from '../components/PasswordRequirements'
import { setCredentials } from '../model/authSlice'
import { writeStoredToken } from '../model/authStorage'
import { useRegisterMutation } from '../../../features/auth/api/authApi'
import { authTokens as auth } from '../../../app/theme'

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [register, { isLoading }] = useRegisterMutation()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitAttempted(true)

    if (!username.trim() || password.length < 8 || password !== confirmPassword || (email.trim() && !isValidEmail(email))) {
      return
    }

    try {
      const response = await register({ username, password, email: email.trim() || undefined }).unwrap()
      writeStoredToken(response.token)
      dispatch(setCredentials(response))
      navigate('/dashboard', { replace: true })
    } catch (registerError) {
      setError(getAuthErrorMessage(registerError))
    }
  }

  return (
    <AuthShell>
      <LogoRow />
      <Typography component="h2" sx={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: '#e6edf3', mb: '5px' }}>
        Create account
      </Typography>
      <Typography sx={{ fontSize: '11px', color: auth.text.muted, mb: '26px' }}>
        Start building your first tile world.
      </Typography>

      <AuthTabStrip active="register" />

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <Box>
          <FieldLabel htmlFor="register-username">Username<Box component="span" sx={{ color: auth.accent }}> *</Box></FieldLabel>
          <FieldInput
            id="register-username"
            type="text"
            name="username"
            value={username}
            autoComplete="username"
            autoFocus
            onChange={(value) => {
              setUsername(value)
              setError(null)
            }}
          />
          {submitAttempted && !username.trim() ? <FieldError>Username is required.</FieldError> : null}
        </Box>

        <Box>
          <FieldLabel htmlFor="register-email">
            Email <Box component="span" sx={{ color: '#6a737d', textTransform: 'none' }}>optional</Box>
          </FieldLabel>
          <FieldInput
            id="register-email"
            type="email"
            name="email"
            value={email}
            autoComplete="email"
            placeholder="you@example.com"
            onChange={(value) => {
              setEmail(value)
              setError(null)
            }}
          />
          {submitAttempted && email.trim() && !isValidEmail(email) ? <FieldError>Enter a valid email address.</FieldError> : null}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Box>
            <FieldLabel htmlFor="register-password">Password<Box component="span" sx={{ color: auth.accent }}> *</Box></FieldLabel>
            <FieldInput
              id="register-password"
              type="password"
              name="password"
              value={password}
              autoComplete="new-password"
              onChange={(value) => {
                setPassword(value)
                setError(null)
              }}
            />
            {submitAttempted && password.length < 8 ? <FieldError>Password must be at least 8 characters.</FieldError> : null}
          </Box>

          <Box>
            <FieldLabel htmlFor="register-confirm">Confirm<Box component="span" sx={{ color: auth.accent }}> *</Box></FieldLabel>
            <FieldInput
              id="register-confirm"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(value) => {
                setConfirmPassword(value)
                setError(null)
              }}
            />
            {submitAttempted && password !== confirmPassword ? <FieldError>Passwords must match.</FieldError> : null}
          </Box>
        </Box>

        <PasswordRequirements password={password} />

        {error ? <AuthErrorBox error={error} /> : null}

        <Box sx={{ mt: '4px' }}>
          <Box component="button" type="submit" disabled={isLoading} sx={submitButtonSx}>
            {isLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Create account →'}
          </Box>
        </Box>
      </Box>

      <FooterLink
        prefix="Already have an account?"
        action="Sign in →"
        onClick={() => navigate('/login')}
      />
    </AuthShell>
  )
}

function LogoRow() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
      <Box component="svg" width="24" height="24" viewBox="0 0 20 20" sx={{ flexShrink: 0 }}>
        <rect x="1" y="1" width="8" height="8" rx="2" fill="#388bfd" />
        <rect x="11" y="1" width="8" height="8" rx="2" fill="#3d8a4e" />
        <rect x="1" y="11" width="8" height="8" rx="2" fill="#e8a832" />
        <rect x="11" y="11" width="8" height="8" rx="2" fill="#388bfd" opacity="0.35" />
      </Box>
      <Typography sx={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em', color: '#e6edf3' }}>
        TileCraft
      </Typography>
    </Box>
  )
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getAuthErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (status === 401) return 'Incorrect username or password.'
    if (status === 409) return 'That username is already taken.'
    if (status === 'FETCH_ERROR') return 'Could not reach the server. Please try again.'
  }
  return 'Could not reach the server. Please try again.'
}
