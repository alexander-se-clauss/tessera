import { Button, FormControl, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material'
import { useState } from 'react'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../AppDialog'
import type { MapGroup, MapGroupType } from '../../model/types'

const dialogSelectSx = {
  '& .MuiInputBase-root': { minHeight: 40 },
}

type CreateGroupDialogProps = {
  open: boolean
  mapGroups: MapGroup[]
  onClose: () => void
  onCreate: (name: string, type: MapGroupType) => Promise<void>
}

export function CreateGroupDialog({ open, mapGroups, onClose, onCreate }: CreateGroupDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<MapGroupType>('world')

  const handleClose = () => {
    setName('')
    setType('world')
    onClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Create map group"
      maxWidth="xs"
      actionsJustify="flex-end"
      actions={
        <>
          <Button onClick={handleClose} sx={dialogCancelButtonSx}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void onCreate(name.trim(), type).then(handleClose)}
            disabled={!name.trim()}
            sx={dialogPrimaryButtonSx}
          >
            Create
          </Button>
        </>
      }
    >
      <TextField autoFocus margin="dense" fullWidth label="Group name" value={name} onChange={(e) => setName(e.target.value)} />
      <FormControl fullWidth margin="dense" size="small" sx={dialogSelectSx}>
        <InputLabel>Type</InputLabel>
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as MapGroupType)}>
          <MenuItem value="world">World</MenuItem>
          <MenuItem value="dungeon">Dungeon</MenuItem>
          <MenuItem value="area">Area</MenuItem>
        </Select>
      </FormControl>
      {type === 'world' && mapGroups.some((g) => g.type === 'world') && (
        <Typography sx={{ mt: 1, fontSize: 12, color: 'warning.main' }}>
          A world group already exists. Only one world group is recommended.
        </Typography>
      )}
    </AppDialog>
  )
}
