import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { Button, Typography } from '@mui/material'
import type { GameMap, MapGroup } from '../model/types'
import { AppDialog, dialogCancelButtonSx } from '../components/AppDialog'

type DeleteGroupDialogProps = {
  open: boolean
  group: MapGroup
  maps: GameMap[]
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteGroupDialog({ open, group, maps, onConfirm, onCancel }: DeleteGroupDialogProps) {
  const assignedMaps = maps.filter((m) => m.mapGroupId === group.id)

  return (
    <AppDialog
      open={open}
      onClose={onCancel}
      title={`Delete "${group.name}"?`}
      maxWidth="xs"
      paperSx={{ minWidth: 360 }}
      actionsJustify="flex-end"
      actions={
        <>
          <Button onClick={onCancel} sx={dialogCancelButtonSx}>Cancel</Button>
          <Button onClick={onConfirm} size="small" variant="contained" color="error">Delete</Button>
        </>
      }
    >
      {assignedMaps.length > 0 && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          {assignedMaps.length} map{assignedMaps.length !== 1 ? 's' : ''} will be unassigned from this group.
        </Typography>
      )}
      {group.isOverworld && (
        <Typography sx={{ fontSize: 13, color: 'warning.main', display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <WarningAmberIcon sx={{ fontSize: 16 }} />
          This is the overworld group. Deleting it will clear the project's overworld reference.
        </Typography>
      )}
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
        This action cannot be undone.
      </Typography>
    </AppDialog>
  )
}
