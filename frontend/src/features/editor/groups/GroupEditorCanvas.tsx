import { Box, Typography } from '@mui/material'
import GridOnIcon from '@mui/icons-material/GridOn'
import { editorTokens as tok } from '../../../app/theme'
import type { GameMap, MapGroup, Tileset } from '../model/types'
import { GroupEditorCell, CELL_MAX_PX } from './GroupEditorCell'
import { rectangleCanvasPatternSx } from '../theme/canvasPattern'

const CELL_GAP = 2

type GroupEditorCanvasProps = {
  group: MapGroup
  maps: GameMap[]
  tilesets: Tileset[]
  selectedCell: { col: number; row: number } | null
  onSelectCell: (col: number, row: number) => void
}

export function GroupEditorCanvas({ group, maps, tilesets, selectedCell, onSelectCell }: GroupEditorCanvasProps) {
  const groupMaps = maps.filter((m) => m.mapGroupId === group.id && m.gridCol != null && m.gridRow != null)

  const maxMapW = groupMaps.length > 0 ? Math.max(...groupMaps.map((m) => m.width)) : 10
  const maxMapH = groupMaps.length > 0 ? Math.max(...groupMaps.map((m) => m.height)) : 8
  const thumbScale = CELL_MAX_PX / Math.max(maxMapW, maxMapH)
  const cellW = Math.max(60, Math.round(maxMapW * thumbScale))
  const cellH = Math.max(48, Math.round(maxMapH * thumbScale))

  const minColsEff = group.minCols ?? 4
  const minRowsEff = group.minRows ?? 4
  let minCol = 0, maxCol = minColsEff - 1
  let minRow = 0, maxRow = minRowsEff - 1
  for (const m of groupMaps) {
    minCol = Math.min(minCol, m.gridCol!)
    maxCol = Math.max(maxCol, m.gridCol!)
    minRow = Math.min(minRow, m.gridRow!)
    maxRow = Math.max(maxRow, m.gridRow!)
  }
  if (maxCol - minCol + 1 < minColsEff) maxCol = minCol + minColsEff - 1
  if (maxRow - minRow + 1 < minRowsEff) maxRow = minRow + minRowsEff - 1

  const mapByPos = new Map<string, GameMap>()
  for (const m of groupMaps) {
    mapByPos.set(`${m.gridCol},${m.gridRow}`, m)
  }

  const cols: number[] = []
  for (let c = minCol; c <= maxCol; c++) cols.push(c)
  const rows: number[] = []
  for (let r = minRow; r <= maxRow; r++) rows.push(r)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        borderRadius: 0,
        borderRight: `1px solid ${tok.border.colorMid}`,
        background: tok.surface.canvas,
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 0.75,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          borderBottom: `1px solid ${tok.border.colorMid}`,
          background: tok.surface.canvas,
          flexShrink: 0,
        }}
      >
        <GridOnIcon sx={{ fontSize: 13, color: tok.text.accent }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#9aa6b5', letterSpacing: '0.08em', textTransform: 'uppercase', flex: 1 }}>
          {group.name}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', ...rectangleCanvasPatternSx }}>
        <Box sx={{ margin: 'auto', p: 4, flexShrink: 0 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols.length}, ${cellW}px)`,
            gridTemplateRows: `repeat(${rows.length}, ${cellH}px)`,
            gap: `${CELL_GAP}px`,
          }}
        >
          {rows.map((row) =>
            cols.map((col) => {
              const map = mapByPos.get(`${col},${row}`) ?? null
              const isSelected = selectedCell?.col === col && selectedCell?.row === row
              if (map) {
                return (
                  <GroupEditorCell
                    key={`${col},${row}`}
                    map={map}
                    tilesets={tilesets}
                    scale={thumbScale}
                    selected={isSelected}
                    cellW={cellW}
                    cellH={cellH}
                    onClick={() => onSelectCell(col, row)}
                  />
                )
              }
              return (
                <Box
                  key={`${col},${row}`}
                  onClick={() => onSelectCell(col, row)}
                  sx={{
                    width: cellW,
                    height: cellH,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                    px: 1,
                    borderRadius: '2px',
                    cursor: 'pointer',
                    border: isSelected
                      ? `2px solid ${tok.text.accent}`
                      : '1px dashed rgba(255,255,255,0.08)',
                    background: isSelected
                      ? 'rgba(77,156,255,0.14)'
                      : 'rgba(255,255,255,0.015)',
                    transition: 'background 0.1s, border-color 0.1s',
                    '&:hover': {
                      background: isSelected
                        ? 'rgba(77,156,255,0.18)'
                        : 'rgba(255,255,255,0.04)',
                    },
                  }}
                >
                  <Typography sx={{ fontSize: 10, color: 'rgba(220,230,245,0.18)', textAlign: 'center', userSelect: 'none' }}>
                    {col},{row}
                  </Typography>
                </Box>
              )
            })
          )}
        </Box>
        </Box>
      </Box>
    </Box>
  )
}
