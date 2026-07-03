import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import type { SpriteState } from '../types/sprite'
import { TAG_COLORS } from '../types/sprite'

type StatesSidebarProps = {
  states: SpriteState[]
  activeStateId: string
  validationErrors: Map<string, string>
  onSetActiveState: (id: string) => void
  onOpenPresetPicker: (anchorEl: HTMLElement) => void
  onDeleteState: (id: string) => void
}

export function StatesSidebar({
  states,
  activeStateId,
  validationErrors,
  onSetActiveState,
  onOpenPresetPicker,
  onDeleteState,
}: StatesSidebarProps) {
  const rowSx = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 1.25,
    py: 0.875,
    cursor: 'pointer',
    borderRadius: '4px',
    minHeight: 36,
    background: active ? 'rgba(93,158,255,0.11)' : 'transparent',
    '&:hover': {
      background: active ? 'rgba(93,158,255,0.15)' : 'rgba(255,255,255,0.04)',
    },
    transition: 'background 100ms',
  })

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        bgcolor: 'transparent',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        pl: 2,
        pr: 1.5,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 0.75,
          py: 0.5,
          mb: 1,
        }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#6a737d', letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1.3 }}>
          States
        </Typography>
        <Tooltip title="Add state">
          <IconButton
            size="small"
            onClick={(event) => onOpenPresetPicker(event.currentTarget)}
            sx={{ color: '#8b949e', p: 0.5, '&:hover': { color: '#e6edf3', background: 'rgba(255,255,255,0.03)' } }}
          >
            <AddIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 0.75, pr: 0.25 }}>
        {states.map((state, index) => {
          const active = state.id === activeStateId
          const deletable = !(state.tag === 'idle' && index === 0)
          const hasError = validationErrors.has(state.id)

          return (
            <Box
              key={state.id}
              sx={{
                ...rowSx(active),
                '&:hover .state-delete': { opacity: deletable ? 1 : 0 },
              }}
              onClick={() => onSetActiveState(state.id)}
              onContextMenu={(event) => {
                if (!deletable) {
                  return
                }
                event.preventDefault()
                onDeleteState(state.id)
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: active ? '#388bfd' : TAG_COLORS[state.tag], flexShrink: 0 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35, color: active ? '#e6edf3' : hasError ? '#ff9080' : '#8b949e', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {state.name}
              </Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.35, color: '#6a737d', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                {state.frames.length}f
              </Typography>
              <Box sx={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                {deletable && (
                  <Tooltip title="Delete state">
                    <IconButton
                      size="small"
                      className="state-delete"
                      onClick={(event) => {
                        event.stopPropagation()
                        onDeleteState(state.id)
                      }}
                      sx={{ opacity: 0, p: 0, color: '#6a737d', '&:hover': { color: '#e84b4a' } }}
                    >
                      <CloseIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
