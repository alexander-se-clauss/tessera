import { Box, Button, List, ListItemButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import { AppDialog, dialogCancelButtonSx } from '../AppDialog'
import type { Tileset } from '../../model/types'

type TilesetTypeFilter = 'all' | 'background' | 'object'

type AssetChooserDialogProps = {
  open: boolean
  assetType: 'environment' | 'character' | null
  environmentTilesets: Tileset[]
  sprites: Tileset[]
  activeTilesetId: number | null
  onClose: () => void
  onEditTileset: (tileset: Tileset) => void
  onEditSprite: (tileset: Tileset) => void
}

export function AssetChooserDialog({
  open, assetType, environmentTilesets, sprites, activeTilesetId, onClose, onEditTileset, onEditSprite,
}: AssetChooserDialogProps) {
  const [tilesetFilter, setTilesetFilter] = useState<TilesetTypeFilter>('all')
  const title = assetType === 'environment' ? 'Edit tileset' : 'Edit sprite'
  const items = useMemo(() => {
    if (assetType !== 'environment') return sprites
    if (tilesetFilter === 'all') return environmentTilesets
    return environmentTilesets.filter((tileset) => tilesetType(tileset) === tilesetFilter)
  }, [assetType, environmentTilesets, sprites, tilesetFilter])
  const showTilesetType = assetType === 'environment' && tilesetFilter === 'all'

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      actionsJustify="flex-end"
      actions={<Button onClick={onClose} sx={dialogCancelButtonSx}>Close</Button>}
      contentSx={{ overflowY: 'auto' }}
    >
      {assetType === 'environment' ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.5 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={tilesetFilter}
            onChange={(_event, value: TilesetTypeFilter | null) => { if (value) setTilesetFilter(value) }}
            sx={{
              '& .MuiToggleButton-root': {
                height: 30,
                px: 1.5,
                borderColor: 'rgba(255,255,255,0.10)',
                color: '#8f9baa',
                fontSize: 12,
                textTransform: 'none',
                '&.Mui-selected': {
                  color: '#4d9cff',
                  bgcolor: 'rgba(77,156,255,0.12)',
                },
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="background">Background</ToggleButton>
            <ToggleButton value="object">Object</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      ) : null}
      {items.length === 0 ? (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>No assets available yet.</Typography>
      ) : (
        <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {items.map((asset) => (
            <ListItemButton
              key={asset.id}
              selected={asset.id === activeTilesetId}
              sx={{ px: 1.5, py: 1.25, borderRadius: 1.5, border: '1px solid', borderColor: asset.id === activeTilesetId ? 'primary.main' : 'divider', alignItems: 'flex-start' }}
              onClick={() => {
                if (assetType === 'environment') {
                  onEditTileset(asset)
                } else {
                  onEditSprite(asset)
                }
                onClose()
              }}
            >
              <Box sx={{ minWidth: 0, width: '100%' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{asset.name}</Typography>
                <Typography sx={{ mt: 0.25, fontSize: 12, color: 'text.secondary' }}>
                  {asset.assetType === 'environment'
                    ? showTilesetType ? `${formatTilesetType(asset)} tileset` : 'Tileset'
                    : 'Sprite'}
                </Typography>
              </Box>
            </ListItemButton>
          ))}
        </List>
      )}
    </AppDialog>
  )
}

function tilesetType(tileset: Tileset): Exclude<TilesetTypeFilter, 'all'> {
  return (tileset.type ?? tileset.metadata?.type) === 'object' ? 'object' : 'background'
}

function formatTilesetType(tileset: Tileset): string {
  return tilesetType(tileset) === 'object' ? 'Object' : 'Background'
}
