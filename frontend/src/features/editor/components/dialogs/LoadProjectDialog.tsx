import { Box, Button, List, ListItemButton, Typography } from '@mui/material'
import { AppDialog, dialogCancelButtonSx } from '../AppDialog'
import type { Project } from '../../model/types'

type LoadProjectDialogProps = {
  open: boolean
  projects: Project[]
  activeProjectId: number | null
  onClose: () => void
  onLoad: (projectId: number, projectName: string) => void
}

export function LoadProjectDialog({ open, projects, activeProjectId, onClose, onLoad }: LoadProjectDialogProps) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Load project"
      maxWidth="sm"
      actionsJustify="flex-end"
      actions={<Button onClick={onClose} sx={dialogCancelButtonSx}>Close</Button>}
      contentSx={{ overflowY: 'auto' }}
    >
      {projects.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No projects available yet.</Typography>
      ) : (
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {projects.map((project) => (
            <ListItemButton
              key={project.id}
              selected={project.id === activeProjectId}
              sx={{ px: 1.5, py: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: project.id === activeProjectId ? 'primary.main' : 'divider', alignItems: 'flex-start' }}
              onClick={() => { onLoad(project.id, project.name); onClose() }}
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
  )
}
