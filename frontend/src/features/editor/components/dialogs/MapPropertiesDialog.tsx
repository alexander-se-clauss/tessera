import { Box, Button, TextField } from '@mui/material'
import { useEffect, useState } from 'react'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../AppDialog'
import type { GameMap } from '../../model/types'

type MapPropertiesDialogProps = {
  open: boolean
  map: GameMap | null
  onClose: () => void
  onSave: (name: string) => Promise<void>
  onDelete: () => Promise<void>
}

export function MapPropertiesDialog({ open, map, onClose, onSave, onDelete }: MapPropertiesDialogProps) {
  const [name, setName] = useState(map?.name ?? '')

  useEffect(() => {
    if (open) setName(map?.name ?? '')
  }, [open, map?.name])

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Map Properties"
      maxWidth="xs"
      actions={
        <>
          <Button color="error" onClick={() => void onDelete()} disabled={!map} sx={{ height: 34, borderRadius: '5px' }}>Delete</Button>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Button onClick={onClose} sx={dialogCancelButtonSx}>Cancel</Button>
            <Button variant="contained" disabled={!name.trim()} onClick={() => void onSave(name.trim())} sx={dialogPrimaryButtonSx}>Save</Button>
          </Box>
        </>
      }
    >
      <TextField autoFocus margin="dense" fullWidth label="Map name" value={name} onChange={(e) => setName(e.target.value)} />
    </AppDialog>
  )
}
