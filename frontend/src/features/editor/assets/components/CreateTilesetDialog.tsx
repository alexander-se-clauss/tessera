import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material'
import { useState } from 'react'

type TilesetType = 'background' | 'object'

type CreateTilesetDialogProps = {
  open: boolean
  onClose: () => void
  onCreate: (payload: { name: string; type: TilesetType; tileWidth: number; tileHeight: number }) => Promise<void>
}

export function CreateTilesetDialog({ open, onClose, onCreate }: CreateTilesetDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<TilesetType>('background')
  const [tileWidth, setTileWidth] = useState(16)
  const [tileHeight, setTileHeight] = useState(16)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onCreate({
        name: name.trim(),
        type,
        tileWidth: Math.max(8, Math.min(64, tileWidth || 16)),
        tileHeight: Math.max(8, Math.min(64, tileHeight || 16)),
      })
      setName('')
      setType('background')
      setTileWidth(16)
      setTileHeight(16)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>New Tileset</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '20px !important' }}>
        <TextField autoFocus label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <TextField select label="Type" value={type} onChange={(event) => setType(event.target.value as TilesetType)}>
          <MenuItem value="background">Background</MenuItem>
          <MenuItem value="object">Object</MenuItem>
        </TextField>
        <TextField label="Tile width" type="number" value={tileWidth} onChange={(event) => setTileWidth(Number(event.target.value))} />
        <TextField label="Tile height" type="number" value={tileHeight} onChange={(event) => setTileHeight(Number(event.target.value))} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!name.trim() || saving} onClick={() => void submit()}>
          Create
        </Button>
      </DialogActions>
    </Dialog>
  )
}
