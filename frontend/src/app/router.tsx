import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { EditorPage } from '../features/editor/pages/EditorPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { RegisterPage } from '../features/auth/pages/RegisterPage'
import { ProtectedRoute } from './shell/ProtectedRoute'
import { PublicOnlyRoute } from './shell/PublicOnlyRoute'
import { LandingPage } from '../features/landing/pages/LandingPage'
import { ProjectLoadedRoute } from './shell/ProjectLoadedRoute'
import { ProjectsStartPage } from '../features/editor/pages/ProjectsStartPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={
            <PublicOnlyRoute>
              <LandingPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectsStartPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ProjectLoadedRoute>
                <EditorPage />
              </ProjectLoadedRoute>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
