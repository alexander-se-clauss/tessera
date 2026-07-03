import AddIcon from '@mui/icons-material/Add'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import CloseIcon from '@mui/icons-material/Close'
import {
  Box,
  Button,
  List,
  ListItemButton,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../components/AppDialog'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import { clearSession, selectCurrentUser } from '../../auth/model/authSlice'
import { clearStoredToken } from '../../auth/model/authStorage'
import { EditorTopBar } from '../components/EditorTopBar'
import { useCreateProjectMutation, useListProjectsQuery } from '../api/editorApi'
import { setActiveProjectId } from '../model/editorSlice'
import { recordRecentProject, removeRecentProject, selectRecentProjects } from '../model/recentProjectsSlice'
import { useAuthErrorMessage } from '../../auth/hooks/useAuthErrorMessage'

export function ProjectsStartPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector(selectCurrentUser)
  const recentProjects = useAppSelector(selectRecentProjects)
  const { getMessage, isAuthFailure } = useAuthErrorMessage()
  const { data: projects = [] } = useListProjectsQuery()
  const [createProject, { isLoading: isCreatingProject }] = useCreateProjectMutation()
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false)
  const [loadProjectDialogOpen, setLoadProjectDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  const recentProjectRows = useMemo(() => {
    const projectMap = new Map(projects.map((project) => [project.id, project]))
    return recentProjects
      .map((entry) => {
        const project = projectMap.get(entry.id)
        return project ? { project, entry } : null
      })
      .filter((row): row is { project: (typeof projects)[number]; entry: (typeof recentProjects)[number] } => Boolean(row))
      .slice(0, 8)
  }, [projects, recentProjects])

  const activateProject = (project: { id: number; name: string }) => {
    dispatch(setActiveProjectId(project.id))
    dispatch(recordRecentProject({ id: project.id, name: project.name }))
    navigate('/dashboard')
  }

  const handleLogout = () => {
    clearStoredToken()
    dispatch(clearSession())
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return
    }

    try {
      const project = await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || undefined,
      }).unwrap()
      setCreateProjectDialogOpen(false)
      setNewProjectName('')
      setNewProjectDescription('')
      activateProject(project)
    } catch (error) {
      if (isAuthFailure(error)) {
        return
      }

      setStatus(getMessage(error))
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: `
          radial-gradient(circle at 50% 20%, rgba(67,96,140,0.16), transparent 34%),
          radial-gradient(circle at 80% 10%, rgba(60,120,220,0.08), transparent 28%),
          linear-gradient(180deg, #151b23 0%, #10161d 45%, #0c1117 100%)
        `,
      }}
    >
      <EditorTopBar
        user={user}
        hasActiveProject={false}
        onSave={() => {}}
        onLogout={handleLogout}
        showMenuBar={false}
        showSaveButton={false}
      />

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', justifyContent: 'center', px: 3, pb: 6, pt: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 3.5 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography sx={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.03em', color: 'rgba(240,245,255,0.94)' }}>
              {user ? `Welcome back, ${user.username}` : 'Projects'}
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'rgba(220,230,245,0.52)' }}>
              Open an existing project or start a new one.
            </Typography>
            {status ? (
              <Typography sx={{ fontSize: 13, color: '#e8a832' }}>
                {status}
              </Typography>
            ) : null}
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 18 }} />}
              onClick={() => setCreateProjectDialogOpen(true)}
              sx={{
                height: 42,
                px: 2,
                textTransform: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(180deg, #6eafff, #4f91ee)',
                boxShadow: '0 8px 22px rgba(73,145,238,0.25)',
              }}
            >
              New project
            </Button>
            <Button
              variant="outlined"
              startIcon={<FolderOpenIcon sx={{ fontSize: 18 }} />}
              onClick={() => setLoadProjectDialogOpen(true)}
              sx={{
                height: 42,
                px: 2,
                textTransform: 'none',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.035)',
                borderColor: 'rgba(255,255,255,0.06)',
                color: 'rgba(240,245,255,0.92)',
              }}
            >
              Open project
            </Button>
          </Box>

          {recentProjectRows.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Recent projects
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {recentProjectRows.map(({ project, entry }) => (
                  <Box
                    key={project.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 1.25,
                      borderRadius: '14px',
                      background: 'rgba(255,255,255,0.025)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      transition: 'background 120ms ease, border-color 120ms ease',
                      '&:hover': {
                        background: 'rgba(255,255,255,0.045)',
                        borderColor: 'rgba(255,255,255,0.06)',
                      },
                    }}
                  >
                    <ListItemButton
                      onClick={() => activateProject(project)}
                      sx={{
                        minWidth: 0,
                        flex: 1,
                        p: 0,
                        borderRadius: 0,
                        '&:hover': { background: 'transparent' },
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 500, color: 'rgba(240,245,255,0.92)' }} noWrap>
                          {project.name}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.46)' }}>
                          {formatRelativeTime(entry.lastOpenedAt)}
                        </Typography>
                      </Box>
                    </ListItemButton>
                    <IconButton
                      size="small"
                      onClick={() => dispatch(removeRecentProject(project.id))}
                      sx={{ color: 'rgba(220,230,245,0.42)' }}
                    >
                      <CloseIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>

      <AppDialog
        open={createProjectDialogOpen}
        onClose={() => setCreateProjectDialogOpen(false)}
        title="Create project"
        maxWidth="sm"
        actionsJustify="flex-end"
        actions={
          <>
            <Button onClick={() => setCreateProjectDialogOpen(false)} sx={dialogCancelButtonSx}>Cancel</Button>
            <Button variant="contained" disabled={isCreatingProject || !newProjectName.trim()} onClick={() => void handleCreateProject()} sx={dialogPrimaryButtonSx}>
              Create
            </Button>
          </>
        }
      >
        <TextField autoFocus margin="dense" fullWidth label="Project name" value={newProjectName} onChange={(event) => setNewProjectName(event.target.value)} />
        <TextField margin="dense" fullWidth label="Description" multiline minRows={3} value={newProjectDescription} onChange={(event) => setNewProjectDescription(event.target.value)} />
      </AppDialog>

      <AppDialog
        open={loadProjectDialogOpen}
        onClose={() => setLoadProjectDialogOpen(false)}
        title="Open project"
        maxWidth="sm"
        actionsJustify="flex-end"
        actions={<Button onClick={() => setLoadProjectDialogOpen(false)} sx={dialogCancelButtonSx}>Close</Button>}
        contentSx={{ overflowY: 'auto' }}
      >
        {projects.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No projects available yet.</Typography>
        ) : (
          <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {projects.map((project) => (
              <ListItemButton
                key={project.id}
                sx={{ px: 1.5, py: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', alignItems: 'flex-start' }}
                onClick={() => { setLoadProjectDialogOpen(false); activateProject(project) }}
              >
                <Box sx={{ minWidth: 0, width: '100%' }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{project.name}</Typography>
                  <Typography sx={{ mt: 0.25, fontSize: 12, color: 'text.secondary' }}>{project.description || 'No description'}</Typography>
                </Box>
              </ListItemButton>
            ))}
          </List>
        )}
      </AppDialog>
    </Box>
  )
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) {
    return 'Recently opened'
  }

  const diff = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < hour) {
    const minutes = Math.max(1, Math.floor(diff / minute))
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (diff < day) {
    const hours = Math.max(1, Math.floor(diff / hour))
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  if (diff < day * 2) {
    return 'Yesterday'
  }

  const days = Math.max(1, Math.floor(diff / day))
  return `${days} days ago`
}
