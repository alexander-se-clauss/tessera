import { Box, Divider, MenuItem, MenuList, Paper } from '@mui/material'
import { editorTokens as tok } from '../../../app/theme'

export type MapContextMenuState = {
  mouseX: number
  mouseY: number
  cellX: number
  cellY: number
}

type MapContextMenuProps = {
  menu: MapContextMenuState
  onClose: () => void
  onSetTemporaryEntryPoint: (x: number, y: number) => void
  onEraseCell: (x: number, y: number) => void
}

export function MapContextMenu({
  menu,
  onClose,
  onSetTemporaryEntryPoint,
  onEraseCell,
}: MapContextMenuProps) {
  return (
    <>
      <Box
        sx={{ position: 'fixed', inset: 0, zIndex: 9998 }}
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault()
          onClose()
        }}
      />
      <Paper
        sx={{
          position: 'fixed',
          top: menu.mouseY,
          left: menu.mouseX,
          zIndex: 9999,
          minWidth: 180,
          py: 0,
          borderRadius: `${tok.radius.control}px`,
          background: tok.background.menu,
          border: tok.border.strong,
          boxShadow: tok.shadow.menu,
          fontFamily: 'inherit',
        }}
      >
        <MenuList dense sx={{ py: 0.5 }}>
          <MenuItem
            dense
            onClick={() => {
              onSetTemporaryEntryPoint(menu.cellX, menu.cellY)
              onClose()
            }}
            sx={{ fontSize: 13, color: 'rgba(220,230,245,0.88)' }}
          >
            Test from here
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem
            dense
            onClick={() => {
              onEraseCell(menu.cellX, menu.cellY)
              onClose()
            }}
            sx={{
              fontSize: 13,
              color: '#E24B4A',
              '&:hover': { background: 'rgba(220,50,50,0.10)' },
            }}
          >
            Erase tile
          </MenuItem>
        </MenuList>
      </Paper>
    </>
  )
}
