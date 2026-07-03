import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../hooks'
import { selectActiveProjectId } from '../../features/editor/model/editorSlice'

type ProjectLoadedRouteProps = {
  children: ReactNode
}

export function ProjectLoadedRoute({ children }: ProjectLoadedRouteProps) {
  const activeProjectId = useAppSelector(selectActiveProjectId)

  if (!activeProjectId) {
    return <Navigate to="/projects" replace />
  }

  return <>{children}</>
}
