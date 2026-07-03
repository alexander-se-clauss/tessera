import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAppSelector } from '../hooks'
import { selectAuthStatus } from '../../features/auth/model/authSlice'

type PublicOnlyRouteProps = {
  children: ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const status = useAppSelector(selectAuthStatus)

  if (status === 'restoring') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (status === 'authenticated') {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}
