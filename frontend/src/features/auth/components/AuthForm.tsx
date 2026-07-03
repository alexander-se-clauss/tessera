import { Button, Stack, TextField } from '@mui/material'
import type { FormEvent } from 'react'

type AuthFormProps = {
  username: string
  password: string
  submitLabel: string
  loading: boolean
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  passwordAutoComplete: 'current-password' | 'new-password'
}

export function AuthForm({
  username,
  password,
  submitLabel,
  loading,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  passwordAutoComplete,
}: AuthFormProps) {
  return (
    <Stack component="form" spacing={2} onSubmit={onSubmit}>
      <TextField
        label="Username"
        value={username}
        onChange={(event) => onUsernameChange(event.target.value)}
        slotProps={{ htmlInput: { minLength: 3, maxLength: 64 } }}
        autoComplete="username"
        required
        fullWidth
      />

      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(event) => onPasswordChange(event.target.value)}
        slotProps={{ htmlInput: { minLength: 6, maxLength: 128 } }}
        autoComplete={passwordAutoComplete}
        required
        fullWidth
      />

      <Button type="submit" variant="contained" size="large" disabled={loading}>
        {loading ? 'Working...' : submitLabel}
      </Button>
    </Stack>
  )
}
