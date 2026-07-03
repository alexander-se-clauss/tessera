import { AppBar, Avatar, Box, IconButton, Menu, MenuItem, Toolbar, Typography } from '@mui/material'
import { editorTokens as tok } from '../../../app/theme'
import ExtensionIcon from '@mui/icons-material/Extension'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import LogoutIcon from '@mui/icons-material/Logout'
import { useState } from 'react'
import type { UserView } from '../../auth/model/types'
import type { EntryPoint, PlayerConfig, SpawnPoint } from '../model/types'
import { EditorMenuBar } from './EditorMenuBar'

type EditorTopBarProps = {
  user: UserView | null
  hasActiveProject: boolean
  hasActiveMap?: boolean
  playerConfig?: PlayerConfig | null
  spawnPoint?: SpawnPoint | null
  temporaryEntryPoint?: EntryPoint | null
  gameRunning?: boolean
  gamePaused?: boolean
  onLogout: () => void
  onOpenCreateProject?: () => void
  onOpenLoadProject?: () => void
  onOpenProjectProperties?: () => void
  onCloseProject?: () => void
  onOpenCreateMap?: () => void
  onOpenMapProperties?: () => void
  onDeleteMap?: () => void
  onOpenCreateTileset?: () => void
  onOpenImportTiles?: () => void
  onEditExistingTileset?: () => void
  onOpenImportSprite?: () => void
  onEditExistingSprite?: () => void
  onOpenPlayerConfig?: () => void
  onGoToPlayerSprite?: () => void
  showMenuBar?: boolean
}

export function EditorTopBar({
  user,
  hasActiveProject,
  hasActiveMap = false,
  playerConfig = null,
  spawnPoint = null,
  temporaryEntryPoint = null,
  gameRunning = false,
  gamePaused = false,
  onLogout,
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
  showMenuBar = true,
}: EditorTopBarProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const initials =
    user?.username
      ?.split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || 'AC'
  const isMenuOpen = Boolean(menuAnchor)

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        sx={{
          height: 56,
          borderBottom: `1px solid ${tok.border.colorMid}`,
          background: 'linear-gradient(180deg, #151e29 0%, #101720 100%)',
          boxShadow: 'none',
        }}
      >
        <Toolbar variant="dense" sx={{ height: 56, px: 3, gap: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 3, flexShrink: 0 }}>
            <ExtensionIcon sx={{ fontSize: 18, color: '#4d9cff' }} />
            <Typography sx={{ fontWeight: 650, fontSize: 18, color: '#d6dee8' }}>
              Tessera
            </Typography>
          </Box>

          {showMenuBar ? (
            <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', flexShrink: 1 }}>
              <EditorMenuBar
                hasActiveProject={hasActiveProject}
                hasActiveMap={hasActiveMap}
                playerConfig={playerConfig}
                spawnPoint={spawnPoint}
                temporaryEntryPoint={temporaryEntryPoint}
                gameRunning={gameRunning}
                gamePaused={gamePaused}
                onOpenCreateProject={onOpenCreateProject ?? (() => {})}
                onOpenLoadProject={onOpenLoadProject ?? (() => {})}
                onOpenProjectProperties={onOpenProjectProperties ?? (() => {})}
                onCloseProject={onCloseProject ?? (() => {})}
                onOpenCreateMap={onOpenCreateMap ?? (() => {})}
                onOpenMapProperties={onOpenMapProperties ?? (() => {})}
                onDeleteMap={onDeleteMap ?? (() => {})}
                onOpenCreateTileset={onOpenCreateTileset ?? (() => {})}
                onOpenImportTiles={onOpenImportTiles ?? (() => {})}
                onEditExistingTileset={onEditExistingTileset ?? (() => {})}
                onOpenImportSprite={onOpenImportSprite ?? (() => {})}
                onEditExistingSprite={onEditExistingSprite ?? (() => {})}
                onOpenPlayerConfig={onOpenPlayerConfig ?? (() => {})}
                onGoToPlayerSprite={onGoToPlayerSprite ?? (() => {})}
              />
            </Box>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}

          <Box sx={{ flex: 1, minWidth: 0 }} />

          <IconButton sx={{ p: 0 }} onClick={(event) => setMenuAnchor(event.currentTarget)}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: 12,
                fontWeight: 700,
                background: 'rgba(77,156,255,0.14)',
                color: '#d6dee8',
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={menuAnchor}
        open={isMenuOpen}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 180,
              borderRadius: 1,
              background: tok.surface.toolbar,
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 14px 34px rgba(0,0,0,0.36)',
            },
          },
        }}
      >
        <MenuItem onClick={() => setMenuAnchor(null)} sx={{ fontSize: 13, gap: 1.25, minHeight: 34 }}>
          <AccountCircleIcon sx={{ fontSize: 17, color: 'text.secondary' }} />
          Profile
        </MenuItem>
        <MenuItem
          onClick={() => { setMenuAnchor(null); onLogout() }}
          sx={{ fontSize: 13, gap: 1.25, minHeight: 34, color: 'error.main', '&:hover': { bgcolor: 'rgba(255, 110, 106, 0.08)' } }}
        >
          <LogoutIcon sx={{ fontSize: 17 }} />
          Logout
        </MenuItem>
      </Menu>
    </>
  )
}
