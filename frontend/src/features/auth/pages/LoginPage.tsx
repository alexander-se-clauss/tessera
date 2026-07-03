import { Box, CircularProgress, Typography } from '@mui/material'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '../../../app/hooks'
import { AuthErrorBox } from '../components/AuthErrorBox'
import { AuthInfoBox } from '../components/AuthInfoBox'
import { AuthShell } from '../components/AuthShell'
import { AuthTabStrip } from '../components/AuthTabStrip'
import { FieldError, FieldInput, FieldLabel, PasswordField } from '../components/PasswordField'
import { FooterLink, submitButtonSx } from '../components/AuthFormElements'
import { setCredentials } from '../model/authSlice'
import { writeStoredToken } from '../model/authStorage'
import { useLoginMutation } from '../../../features/auth/api/authApi'
import { authTokens as auth } from '../../../app/theme'

const demoCredentials = {
  username: 'testuser',
  password: 'pass123',
}

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [username, setUsername] = useState(demoCredentials.username)
  const [password, setPassword] = useState(demoCredentials.password)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [login, { isLoading }] = useLoginMutation()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitAttempted(true)

    if (!username.trim() || !password) {
      return
    }

    try {
      const response = await login({ username, password }).unwrap()
      writeStoredToken(response.token)
      dispatch(setCredentials(response))
      navigate('/projects', { replace: true })
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError))
    }
  }

  return (
    <AuthShell>
      <LogoRow />
      <Typography component="h2" sx={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em', color: '#e6edf3', mb: '5px' }}>
        Sign in
      </Typography>
      <Typography sx={{ fontSize: '11px', color: auth.text.muted, mb: '26px' }}>
        Continue to your projects and tile maps.
      </Typography>

      <AuthTabStrip active="login" />

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Box>
          <FieldLabel htmlFor="login-username">Username<Box component="span" sx={{ color: auth.accent }}> *</Box></FieldLabel>
          <FieldInput
            id="login-username"
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

        <PasswordField
          id="login-password"
          name="password"
          value={password}
          autoComplete="current-password"
          label="Password"
          error={submitAttempted && !password ? 'Password is required.' : null}
          onChange={(value) => {
            setPassword(value)
            setError(null)
          }}
        />

        {error ? <AuthErrorBox error={error} /> : null}

        <Box sx={{ mt: '4px' }}>
          <Box
            component="button"
            type="submit"
            disabled={isLoading}
            sx={submitButtonSx}
          >
            {isLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Sign in'}
          </Box>
        </Box>
      </Box>

      <AuthInfoBox text="Login is ready. The demo account is prefilled." />

      <FooterLink
        prefix="No account?"
        action="Create one →"
        onClick={() => navigate('/register')}
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

function getAuthErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    if (status === 401) return 'Incorrect username or password.'
    if (status === 409) return 'That username is already taken.'
    if (status === 'FETCH_ERROR') return 'Could not reach the server. Please try again.'
  }
  return 'Could not reach the server. Please try again.'
}
