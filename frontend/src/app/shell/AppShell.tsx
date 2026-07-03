import { Alert, Box } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../hooks'
import { selectAuthStatus, selectAuthToken, setCurrentUser, startSessionRestore } from '../../features/auth/model/authSlice'
import { clearStoredToken } from '../../features/auth/model/authStorage'
import { useGetCurrentUserQuery } from '../../features/auth/api/authApi'
import { selectRecentProjects, writeRecentProjects } from '../../features/editor/model/recentProjectsSlice'

export function AppShell() {
  const dispatch = useAppDispatch()
  const token = useAppSelector(selectAuthToken)
  const status = useAppSelector(selectAuthStatus)
  const recentProjects = useAppSelector(selectRecentProjects)
  const { data, error, isFetching } = useGetCurrentUserQuery(undefined, {
    skip: !token,
  })

  useEffect(() => {
    if (token && status !== 'authenticated') {
      dispatch(startSessionRestore())
    }
  }, [dispatch, status, token])

  useEffect(() => {
    if (data) {
      dispatch(setCurrentUser(data))
    }
  }, [data, dispatch])

  useEffect(() => {
    if (error) {
      clearStoredToken()
    }
  }, [error])

  useEffect(() => {
    writeRecentProjects(recentProjects)
  }, [recentProjects])

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {token && isFetching ? (
        <Alert severity="info" sx={{ borderRadius: 0 }}>
          Restoring session...
        </Alert>
      ) : null}
      {!token || status !== 'restoring' ? <Outlet /> : null}
    </Box>
  )
}
