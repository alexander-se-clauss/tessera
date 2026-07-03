import { useState } from 'react'
import { Box, ButtonBase, Menu, MenuItem } from '@mui/material'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import type { EntryPoint, PlayerConfig, SpawnPoint } from '../model/types'
import { editorTokens as tok } from '../../../app/theme'

type EditorMenuBarProps = {
  hasActiveProject: boolean
  hasActiveMap: boolean
  playerConfig: PlayerConfig | null
  spawnPoint: SpawnPoint | null
  temporaryEntryPoint: EntryPoint | null
  gameRunning: boolean
  gamePaused: boolean
  onOpenCreateProject: () => void
  onOpenLoadProject: () => void
  onOpenProjectProperties: () => void
  onCloseProject: () => void
  onOpenCreateMap: () => void
  onOpenMapProperties: () => void
  onDeleteMap: () => void
  onOpenCreateTileset: () => void
  onOpenImportTiles: () => void
  onEditExistingTileset: () => void
  onOpenImportSprite: () => void
  onEditExistingSprite: () => void
  onOpenPlayerConfig: () => void
  onGoToPlayerSprite: () => void
}

const menuItemTriggerSx = {
  height: 38,
  minWidth: 0,
  px: '15px',
  borderRadius: '8px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.75,
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1,
  color: '#8f9baa',
  background: 'transparent',
  border: '1px solid transparent',
  transition: 'background 120ms ease, color 120ms ease',
  '&:hover': {
    background: 'rgba(255,255,255,0.055)',
    color: '#d6dee8',
  },
  '&.Mui-disabled': {
    color: 'rgba(220,230,245,0.28)',
  },
}

const menuPaperSx = {
  mt: 1,
  minWidth: 220,
  borderRadius: 1,
  background: tok.surface.toolbar,
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow: tok.shadow.menu,
  '& .MuiMenuItem-root': {
    minHeight: 34,
    fontSize: 13,
    borderRadius: 1.25,
    mx: 0.75,
    my: 0.25,
    color: '#d6dee8',
    '&:hover': {
      background: tok.border.colorDefault,
    },
  },
}

function EditorMenuBarItem({
  label,
  open = false,
  disabled = false,
  onClick,
}: {
  label: string
  open?: boolean
  disabled?: boolean
  onClick: (event: React.MouseEvent<HTMLElement>) => void
}) {
  return (
    <ButtonBase disabled={disabled} onClick={onClick} sx={{ ...menuItemTriggerSx, ...(open ? { background: 'rgba(77,156,255,0.12)', color: '#d6dee8' } : null) }}>
      <Box component="span">{label}</Box>
      <KeyboardArrowDownIcon sx={{ fontSize: 16, color: 'currentColor', opacity: 0.75 }} />
    </ButtonBase>
  )
}

export function EditorMenuBar(props: EditorMenuBarProps) {
  const {
    hasActiveProject,
    hasActiveMap,
    onOpenCreateProject,
    onOpenLoadProject,
    onOpenProjectProperties,
    onCloseProject,
    onOpenCreateMap,
    onOpenMapProperties,
    onDeleteMap,
    onOpenCreateTileset,
    onOpenImportTiles,
    onEditExistingTileset,
    onOpenImportSprite,
    onEditExistingSprite,
    onOpenPlayerConfig,
    onGoToPlayerSprite,
  } = props

  const [projectAnchor, setProjectAnchor] = useState<null | HTMLElement>(null)
  const [mapsAnchor, setMapsAnchor] = useState<null | HTMLElement>(null)
  const [assetsAnchor, setAssetsAnchor] = useState<null | HTMLElement>(null)
  const [playerAnchor, setPlayerAnchor] = useState<null | HTMLElement>(null)

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, minWidth: 0 }}>
      <EditorMenuBarItem label="Project" open={Boolean(projectAnchor)} onClick={(e) => setProjectAnchor(e.currentTarget)} />

      <Menu
        anchorEl={projectAnchor}
        open={Boolean(projectAnchor)}
        onClose={() => setProjectAnchor(null)}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        <MenuItem dense onClick={() => { setProjectAnchor(null); onOpenCreateProject() }}>
          New Project…
        </MenuItem>
        <MenuItem dense onClick={() => { setProjectAnchor(null); onOpenLoadProject() }}>
          Load Project…
        </MenuItem>
        <Box component="li" sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.5, listStyle: 'none' }} />
        <MenuItem dense disabled={!hasActiveProject} onClick={() => { setProjectAnchor(null); onOpenProjectProperties() }}>
          Project Properties…
        </MenuItem>
        <MenuItem dense disabled={!hasActiveProject} onClick={() => { setProjectAnchor(null); onCloseProject() }}>
          Close Project
        </MenuItem>
      </Menu>

      <EditorMenuBarItem label="Maps" open={Boolean(mapsAnchor)} disabled={!hasActiveProject} onClick={(e) => setMapsAnchor(e.currentTarget)} />

      <Menu
        anchorEl={mapsAnchor}
        open={Boolean(mapsAnchor)}
        onClose={() => setMapsAnchor(null)}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        <MenuItem dense onClick={() => { setMapsAnchor(null); onOpenCreateMap() }}>
          New Map…
        </MenuItem>
        <Box component="li" sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.5, listStyle: 'none' }} />
        <MenuItem dense disabled={!hasActiveMap} onClick={() => { setMapsAnchor(null); onOpenMapProperties() }}>
          Map Properties…
        </MenuItem>
        <MenuItem dense disabled={!hasActiveMap} onClick={() => { setMapsAnchor(null); onDeleteMap() }}>
          Delete Map
        </MenuItem>
      </Menu>

      <EditorMenuBarItem label="Assets" open={Boolean(assetsAnchor)} disabled={!hasActiveProject} onClick={(e) => setAssetsAnchor(e.currentTarget)} />

      <Menu
        anchorEl={assetsAnchor}
        open={Boolean(assetsAnchor)}
        onClose={() => setAssetsAnchor(null)}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        <MenuItem dense onClick={() => { setAssetsAnchor(null); onOpenCreateTileset() }}>
          New Tileset…
        </MenuItem>
        <MenuItem dense onClick={() => { setAssetsAnchor(null); onOpenImportTiles() }}>
          Import Tiles…
        </MenuItem>
        <MenuItem dense onClick={() => { setAssetsAnchor(null); onEditExistingTileset() }}>
          Edit Tileset…
        </MenuItem>
        <Box component="li" sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.5, listStyle: 'none' }} />
        <MenuItem dense onClick={() => { setAssetsAnchor(null); onOpenImportSprite() }}>
          Import Sprite…
        </MenuItem>
        <MenuItem dense onClick={() => { setAssetsAnchor(null); onEditExistingSprite() }}>
          Edit Sprite…
        </MenuItem>
      </Menu>

      <EditorMenuBarItem label="Player" open={Boolean(playerAnchor)} disabled={!hasActiveProject} onClick={(e) => setPlayerAnchor(e.currentTarget)} />

      <Menu
        anchorEl={playerAnchor}
        open={Boolean(playerAnchor)}
        onClose={() => setPlayerAnchor(null)}
        slotProps={{ paper: { sx: menuPaperSx } }}
      >
        <MenuItem dense onClick={() => { setPlayerAnchor(null); onOpenPlayerConfig() }}>
          Configure player…
        </MenuItem>
        <Box component="li" sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.5, listStyle: 'none' }} />
        <MenuItem dense onClick={() => { setPlayerAnchor(null); onGoToPlayerSprite() }}>
          Go to player sprite…
        </MenuItem>
      </Menu>
    </Box>
  )
}
