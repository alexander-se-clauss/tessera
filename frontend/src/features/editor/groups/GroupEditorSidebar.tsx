import { Box, Button, Divider, Typography } from '@mui/material'
import MapIcon from '@mui/icons-material/Map'
import PublicIcon from '@mui/icons-material/Public'
import type { GameMap, MapGroup } from '../model/types'
import { editorTokens as tok } from '../../../app/theme'

type GroupEditorSidebarProps = {
  group: MapGroup
  maps: GameMap[]
  selectedCell: { col: number; row: number } | null
  onOpenMap: (mapId: number) => void
  onAssignMap: (mapId: number, col: number, row: number) => void
  onRemoveMap: (mapId: number) => void
}

export function GroupEditorSidebar({
  group,
  maps,
  selectedCell,
  onOpenMap,
  onAssignMap,
  onRemoveMap,
}: GroupEditorSidebarProps) {
  const groupMaps = maps.filter((m) => m.mapGroupId === group.id && m.gridCol != null && m.gridRow != null)
  const unplacedMaps = maps.filter((m) => m.gridCol == null && m.gridRow == null)

  const selectedMap = selectedCell
    ? groupMaps.find((m) => m.gridCol === selectedCell.col && m.gridRow === selectedCell.row) ?? null
    : null

  const groupTypeLabel = group.type === 'world' ? 'World' : group.type === 'dungeon' ? 'Dungeon' : 'Area'

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        borderRadius: 0,
        background: tok.surface.panel,
        borderLeft: `1px solid ${tok.border.colorMid}`,
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9aa6b5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {groupTypeLabel}
          </Typography>
          {group.isOverworld && (
            <PublicIcon sx={{ fontSize: 10, color: tok.text.accent }} />
          )}
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: tok.text.primary }}>
          {group.name}
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      <Box sx={{ flex: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {selectedCell ? (
          <>
            {selectedMap ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapIcon sx={{ fontSize: 14, color: tok.text.accent, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: tok.text.primary, minWidth: 0 }} noWrap>
                    {selectedMap.name}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: tok.text.muted }}>
                  {selectedMap.width}×{selectedMap.height} tiles · {selectedMap.tileWidth}×{selectedMap.tileHeight}px
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onOpenMap(selectedMap.id)}
                  sx={{ fontSize: 12, mt: 0.5 }}
                >
                  Open map
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  onClick={() => onRemoveMap(selectedMap.id)}
                  sx={{ fontSize: 12 }}
                >
                  Remove from group
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography sx={{ fontSize: 12, color: tok.text.muted }}>
                  Empty cell — place a map here:
                </Typography>
                {unplacedMaps.length === 0 ? (
                  <Typography sx={{ fontSize: 12, color: tok.text.faint }}>
                    No unplaced maps available.
                  </Typography>
                ) : (
                  unplacedMaps.map((m) => (
                    <Button
                      key={m.id}
                      size="small"
                      variant="outlined"
                      onClick={() => onAssignMap(m.id, selectedCell.col, selectedCell.row)}
                      sx={{
                        fontSize: 12,
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.name}
                    </Button>
                  ))
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography sx={{ fontSize: 12, color: tok.text.faint }}>
            Click a cell to see details.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
