import MouseIcon from '@mui/icons-material/Mouse'
import { editorTokens as tok } from '../../../app/theme'
import BrushRoundedIcon from '@mui/icons-material/BrushRounded'
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded'
import CropFreeRoundedIcon from '@mui/icons-material/CropFreeRounded'
import InvertColorsRoundedIcon from '@mui/icons-material/InvertColorsRounded'
import PanToolAltRoundedIcon from '@mui/icons-material/PanToolAltRounded'
import GridOnRoundedIcon from '@mui/icons-material/GridOnRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import RestoreRoundedIcon from '@mui/icons-material/RestoreRounded'
import { Box, Tooltip, Typography } from '@mui/material'
import type { DrawMode } from '../model'
import { EditorToolbarButton } from './EditorToolbar'

type ToolRailProps = {
  drawMode: DrawMode
  showGrid: boolean
  gameRunning: boolean
  gamePaused: boolean
  canPlay: boolean
  onSelectDrawMode: (drawMode: DrawMode) => void
  onToggleGrid: () => void
  onPlayPause: () => void
}

const toolItems: Array<{ mode: DrawMode; label: string; icon: React.ReactNode }> = [
  { mode: 'select', label: 'Select', icon: <MouseIcon /> },
  { mode: 'single', label: 'Brush', icon: <BrushRoundedIcon /> },
  { mode: 'erase', label: 'Eraser', icon: <DeleteSweepRoundedIcon /> },
  { mode: 'area', label: 'Rect', icon: <CropFreeRoundedIcon /> },
]

export function ToolRail({ drawMode, showGrid, gameRunning, gamePaused, canPlay, onSelectDrawMode, onToggleGrid, onPlayPause }: ToolRailProps) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        background: tok.surface.panel,
        borderRight: `1px solid ${tok.border.colorMid}`,
      }}
    >
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.85,
          py: 1.25,
          borderRadius: 0,
          background: tok.surface.panel,
        }}
      >
        {toolItems.map((tool) => {
          const active = drawMode === tool.mode
          return (
            <Tooltip key={tool.mode} title={tool.label} placement="right">
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
                <EditorToolbarButton icon={tool.icon} label={tool.label} active={active} onClick={() => onSelectDrawMode(tool.mode)} />
                <Typography sx={{ fontSize: 11, fontWeight: active ? 600 : 500, color: active ? '#4d9cff' : '#8f9baa', lineHeight: 1 }}>
                  {tool.label}
                </Typography>
              </Box>
            </Tooltip>
          )
        })}

        <Box sx={{ width: '100%', height: 1, my: 0.5 }} />

        <Tooltip title="Picker" placement="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <EditorToolbarButton icon={<InvertColorsRoundedIcon />} label="Picker" disabled />
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: '#667383', lineHeight: 1 }}>Picker</Typography>
          </Box>
        </Tooltip>
        <Tooltip title="Move" placement="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <EditorToolbarButton icon={<PanToolAltRoundedIcon />} label="Move" disabled />
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: '#667383', lineHeight: 1 }}>Move</Typography>
          </Box>
        </Tooltip>

        <Tooltip title={showGrid ? 'Hide grid' : 'Show grid'} placement="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <EditorToolbarButton icon={<GridOnRoundedIcon />} label={showGrid ? 'Hide grid' : 'Show grid'} active={showGrid} onClick={onToggleGrid} />
            <Typography sx={{ fontSize: 11, fontWeight: showGrid ? 600 : 500, color: showGrid ? '#4d9cff' : '#8f9baa', lineHeight: 1 }}>Grid</Typography>
          </Box>
        </Tooltip>

        <Box sx={{ width: '70%', alignSelf: 'center', height: 1, my: 0.5, bgcolor: 'rgba(255,255,255,0.07)' }} />

        <Tooltip title={gameRunning && !gamePaused ? 'Pause (F10)' : 'Play (F10)'} placement="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <EditorToolbarButton
              icon={gameRunning && !gamePaused ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
              label={gameRunning && !gamePaused ? 'Pause' : 'Play'}
              active={gameRunning && !gamePaused}
              primary={canPlay && !(gameRunning && !gamePaused)}
              disabled={!canPlay && !gameRunning}
              onClick={onPlayPause}
            />
            <Typography sx={{ fontSize: 11, fontWeight: gameRunning || canPlay ? 600 : 500, color: gameRunning || canPlay ? '#97C459' : '#667383', lineHeight: 1 }}>
              {gameRunning && !gamePaused ? 'Pause' : 'Play'}
            </Typography>
          </Box>
        </Tooltip>
        <Tooltip title="Revert" placement="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.75 }}>
            <EditorToolbarButton icon={<RestoreRoundedIcon />} label="Revert" disabled />
            <Typography sx={{ fontSize: 11, fontWeight: 500, color: '#667383', lineHeight: 1 }}>Revert</Typography>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  )
}
