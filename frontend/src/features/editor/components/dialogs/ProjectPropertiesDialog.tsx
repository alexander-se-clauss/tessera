import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../AppDialog'
import type { GameMap, Project } from '../../model/types'

type ProjectPropertiesDialogProps = {
  open: boolean
  activeProject: Project | null
  maps: GameMap[]
  onClose: () => void
  onSave: (entryPoint: { mapId: number; x: number; y: number } | null) => Promise<void>
}

export function ProjectPropertiesDialog({ open, activeProject, maps, onClose, onSave }: ProjectPropertiesDialogProps) {
  const [entryPointMapId, setEntryPointMapId] = useState<number | ''>(activeProject?.entryPoint?.mapId ?? '')
  const [entryPointX, setEntryPointX] = useState(activeProject?.entryPoint ? String(activeProject.entryPoint.x) : '')
  const [entryPointY, setEntryPointY] = useState(activeProject?.entryPoint ? String(activeProject.entryPoint.y) : '')

  useEffect(() => {
    if (open) {
      const ep = activeProject?.entryPoint ?? null
      setEntryPointMapId(ep?.mapId ?? '')
      setEntryPointX(ep ? String(ep.x) : '')
      setEntryPointY(ep ? String(ep.y) : '')
    }
  }, [open, activeProject?.entryPoint])

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Project Properties"
      maxWidth="sm"
      actions={
        <>
          <Button color="error" onClick={() => void onSave(null)} disabled={!activeProject?.entryPoint} sx={{ height: 34, borderRadius: '5px' }}>Clear</Button>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button onClick={onClose} sx={dialogCancelButtonSx}>Cancel</Button>
            <Button
              variant="contained"
              disabled={!entryPointMapId || entryPointX === '' || entryPointY === ''}
              onClick={() => {
                if (!entryPointMapId) return
                void onSave({ mapId: entryPointMapId as number, x: Number(entryPointX), y: Number(entryPointY) })
              }}
              sx={dialogPrimaryButtonSx}
            >
              Save
            </Button>
          </Box>
        </>
      }
    >
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1.5, mt: 0.5 }}>Entry Point</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
        The cell where the player spawns when starting the game. Saved with the project.
      </Typography>
      <FormControl fullWidth margin="dense" size="small">
        <InputLabel>Map</InputLabel>
        <Select label="Map" value={entryPointMapId} onChange={(e) => setEntryPointMapId(e.target.value as number | '')}>
          <MenuItem value=""><em>None</em></MenuItem>
          {maps.map((map) => (
            <MenuItem key={map.id} value={map.id}>{map.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <TextField label="X" size="small" type="number" fullWidth value={entryPointX} onChange={(e) => setEntryPointX(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} />
        <TextField label="Y" size="small" type="number" fullWidth value={entryPointY} onChange={(e) => setEntryPointY(e.target.value)} slotProps={{ htmlInput: { min: 0 } }} />
      </Box>
      {activeProject?.entryPoint ? (
        <Typography sx={{ mt: 2, fontSize: 12, color: 'text.secondary' }}>
          Current: map {activeProject.entryPoint.mapId} — ({activeProject.entryPoint.x}, {activeProject.entryPoint.y})
        </Typography>
      ) : (
        <Typography sx={{ mt: 2, fontSize: 12, color: 'text.disabled' }}>No entry point set.</Typography>
      )}
    </AppDialog>
  )
}
