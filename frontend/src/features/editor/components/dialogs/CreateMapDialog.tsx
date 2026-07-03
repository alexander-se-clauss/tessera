import { Box, Button, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../AppDialog'
import type { GameMap, MapGroup } from '../../model/types'
import {
  STANDARD_MAP_COLUMNS,
  STANDARD_MAP_PIXEL_HEIGHT,
  STANDARD_MAP_PIXEL_WIDTH,
  STANDARD_MAP_ROWS,
  STANDARD_TILE_SIZE,
} from '../../model/mapConstants'

type CreateMapDialogProps = {
  open: boolean
  maps: GameMap[]
  mapGroups: MapGroup[]
  targetGroupId: number | null
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

export function CreateMapDialog({ open, maps, mapGroups, targetGroupId, onClose, onCreate }: CreateMapDialogProps) {
  const [name, setName] = useState(`map_${maps.length + 1}`)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setName(`map_${maps.length + 1}`) }, [open])

  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <AppDialog
      open={open}
      onClose={handleClose}
      title="Create map"
      maxWidth="xs"
      actionsJustify="flex-end"
      actions={
        <>
          <Button onClick={handleClose} sx={dialogCancelButtonSx}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void onCreate(name.trim()).then(handleClose)}
            disabled={!name.trim()}
            sx={dialogPrimaryButtonSx}
          >
            Create
          </Button>
        </>
      }
    >
      <TextField autoFocus margin="dense" fullWidth label="Map name" value={name} onChange={(e) => setName(e.target.value)} />
      <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>
        Fixed map size: {STANDARD_MAP_COLUMNS} × {STANDARD_MAP_ROWS} tiles · {STANDARD_MAP_PIXEL_WIDTH} × {STANDARD_MAP_PIXEL_HEIGHT} px at {STANDARD_TILE_SIZE}px tiles
      </Typography>
      {targetGroupId != null && (
        <Typography sx={{ mt: 0.5, fontSize: 12, color: 'text.secondary' }}>
          Group: {mapGroups.find((g) => g.id === targetGroupId)?.name}
        </Typography>
      )}
    </AppDialog>
  )
}
