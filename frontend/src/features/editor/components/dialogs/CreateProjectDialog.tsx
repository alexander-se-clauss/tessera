import { Button, TextField } from '@mui/material'
import { useState } from 'react'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../AppDialog'

type CreateProjectDialogProps = {
  open: boolean
  isCreating: boolean
  onClose: () => void
  onCreate: (name: string, description: string) => Promise<void>
}

export function CreateProjectDialog({ open, isCreating, onClose, onCreate }: CreateProjectDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleClose = () => {
    setName('')
    setDescription('')
    onClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Create project"
      maxWidth="sm"
      actionsJustify="flex-end"
      actions={
        <>
          <Button onClick={handleClose} sx={dialogCancelButtonSx}>Cancel</Button>
          <Button
            variant="contained"
            disabled={isCreating || !name.trim()}
            onClick={() => void onCreate(name.trim(), description.trim()).then(handleClose)}
            sx={dialogPrimaryButtonSx}
          >
            Create
          </Button>
        </>
      }
    >
      <TextField autoFocus margin="dense" fullWidth label="Project name" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField margin="dense" fullWidth label="Description" multiline minRows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
    </AppDialog>
  )
}
