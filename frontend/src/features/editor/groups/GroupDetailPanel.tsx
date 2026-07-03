import { useEffect, useRef, useState } from 'react'
import { editorTokens as tok } from '../../../app/theme'
import { Box, Button, Divider, IconButton, TextField, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import MapIcon from '@mui/icons-material/Map'
import PublicIcon from '@mui/icons-material/Public'
import LayersIcon from '@mui/icons-material/Layers'
import type { GameMap, MapGroup } from '../model/types'
import { useAssignMapToGroupMutation, useDeleteMapGroupMutation, useUpdateMapGroupMutation } from '../api/editorApi'
import { useAppDispatch } from '../../../app/hooks'
import { setActiveGroupId } from '../model/editorSlice'
import { DeleteGroupDialog } from './DeleteGroupDialog'

type GroupDetailPanelProps = {
  group: MapGroup
  projectId: number
  maps: GameMap[]
  selectedCell: { col: number; row: number } | null
  onOpenMap: (mapId: number) => void
  onCellDeselect: () => void
}

function effectiveCols(group: MapGroup) { return group.minCols ?? 4 }
function effectiveRows(group: MapGroup) { return group.minRows ?? 4 }

export function GroupDetailPanel({ group, projectId, maps, selectedCell, onOpenMap, onCellDeselect }: GroupDetailPanelProps) {
  const dispatch = useAppDispatch()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(group.name)
  const [colsValue, setColsValue] = useState(String(effectiveCols(group)))
  const [rowsValue, setRowsValue] = useState(String(effectiveRows(group)))
  const [gridDirty, setGridDirty] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const [updateMapGroup, { isLoading: isSaving }] = useUpdateMapGroupMutation()
  const [deleteMapGroup] = useDeleteMapGroupMutation()
  const [assignMapToGroup] = useAssignMapToGroupMutation()

  useEffect(() => {
    setNameValue(group.name)
    setColsValue(String(effectiveCols(group)))
    setRowsValue(String(effectiveRows(group)))
    setGridDirty(false)
    setEditingName(false)
  }, [group])

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus()
  }, [editingName])

  const groupMaps = maps.filter((m) => m.mapGroupId === group.id && m.gridCol != null && m.gridRow != null)
  const unplacedMaps = maps.filter((m) => m.gridCol == null && m.gridRow == null)
  const selectedMap = selectedCell
    ? groupMaps.find((m) => m.gridCol === selectedCell.col && m.gridRow === selectedCell.row) ?? null
    : null
  const groupIcon = group.type === 'world'
    ? <PublicIcon sx={{ fontSize: 14, color: tok.text.accent, flexShrink: 0 }} />
    : group.type === 'dungeon'
      ? <LayersIcon sx={{ fontSize: 14, color: tok.text.muted, flexShrink: 0 }} />
      : <MapIcon sx={{ fontSize: 14, color: tok.text.muted, flexShrink: 0 }} />

  const saveName = async () => {
    const trimmed = nameValue.trim()
    setEditingName(false)
    if (!trimmed || trimmed === group.name) {
      setNameValue(group.name)
      return
    }
    await updateMapGroup({
      groupId: group.id,
      projectId,
      body: { name: trimmed, type: group.type, isOverworld: group.isOverworld, minCols: effectiveCols(group), minRows: effectiveRows(group) },
    })
  }

  const saveGridSize = async () => {
    const cols = Math.max(1, Math.min(64, parseInt(colsValue) || effectiveCols(group)))
    const rows = Math.max(1, Math.min(64, parseInt(rowsValue) || effectiveRows(group)))
    setColsValue(String(cols))
    setRowsValue(String(rows))
    setGridDirty(false)
    await updateMapGroup({
      groupId: group.id,
      projectId,
      body: { name: group.name, type: group.type, isOverworld: group.isOverworld, minCols: cols, minRows: rows },
    })
  }

  const handleAssignMap = async (mapId: number) => {
    if (!selectedCell) return
    await assignMapToGroup({
      mapId,
      projectId,
      body: { mapGroupId: group.id, gridCol: selectedCell.col, gridRow: selectedCell.row },
    })
  }

  const handleRemoveMap = async (mapId: number) => {
    await assignMapToGroup({
      mapId,
      projectId,
      body: { mapGroupId: null, gridCol: null, gridRow: null },
    })
    onCellDeselect()
  }

  const handleDelete = async () => {
    setDeleteDialogOpen(false)
    await deleteMapGroup({ groupId: group.id, projectId })
    dispatch(setActiveGroupId(null))
  }

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
      {/* Identity */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1.25, flexShrink: 0 }}>
        {editingName ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {groupIcon}
            <TextField
              inputRef={nameInputRef}
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveName()
                if (e.key === 'Escape') { setEditingName(false); setNameValue(group.name) }
              }}
              onBlur={() => void saveName()}
              size="small"
              variant="standard"
              sx={{ flex: 1, '& input': { fontSize: 14, fontWeight: 600 } }}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => void saveName()}>
              <CheckIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <IconButton size="small" onMouseDown={(e) => e.preventDefault()} onClick={() => { setEditingName(false); setNameValue(group.name) }}>
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {groupIcon}
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: tok.text.primary, flex: 1 }} noWrap>
              {group.name}
            </Typography>
            <IconButton size="small" onClick={() => setEditingName(true)} sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}>
              <EditIcon sx={{ fontSize: 13 }} />
            </IconButton>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      {/* Cell details */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.85 }}>
        {selectedCell ? (
          selectedMap ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapIcon sx={{ fontSize: 14, color: tok.text.accent, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: tok.text.primary, minWidth: 0 }} noWrap>
                  {selectedMap.name}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 12, color: tok.text.muted }}>
                {selectedMap.width}×{selectedMap.height} tiles · {selectedMap.tileWidth}×{selectedMap.tileHeight}px
              </Typography>
              <Button size="small" variant="contained" onClick={() => onOpenMap(selectedMap.id)} sx={{ fontSize: 12 }}>
                Open map
              </Button>
              <Button size="small" color="error" variant="outlined" onClick={() => void handleRemoveMap(selectedMap.id)} sx={{ fontSize: 12 }}>
                Remove from group
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ fontSize: 12, color: tok.text.muted }}>
                Empty cell — place a map here:
              </Typography>
              {unplacedMaps.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: tok.text.faint }}>No unplaced maps available.</Typography>
              ) : (
                unplacedMaps.map((m) => (
                  <Button
                    key={m.id}
                    size="small"
                    variant="outlined"
                    onClick={() => void handleAssignMap(m.id)}
                    sx={{ fontSize: 12, justifyContent: 'flex-start', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {m.name}
                  </Button>
                ))
              )}
            </>
          )
        ) : (
          <Typography sx={{ fontSize: 12, color: tok.text.faint }}>
            Click a cell to see details.
          </Typography>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      {/* Grid size */}
      <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#9aa6b5', letterSpacing: '0.08em', textTransform: 'uppercase', mb: 1 }}>
          Grid Size
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10, color: tok.text.muted, mb: 0.25 }}>Columns</Typography>
            <TextField
              value={colsValue}
              onChange={(e) => { setColsValue(e.target.value); setGridDirty(true) }}
              onKeyDown={(e) => { if (e.key === 'Enter') void saveGridSize() }}
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 64 } }}
              sx={{ '& input': { fontSize: 13, py: 0.5 } }}
              fullWidth
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 10, color: tok.text.muted, mb: 0.25 }}>Rows</Typography>
            <TextField
              value={rowsValue}
              onChange={(e) => { setRowsValue(e.target.value); setGridDirty(true) }}
              onKeyDown={(e) => { if (e.key === 'Enter') void saveGridSize() }}
              size="small"
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 64 } }}
              sx={{ '& input': { fontSize: 13, py: 0.5 } }}
              fullWidth
            />
          </Box>
        </Box>
        <Button
          size="small"
          variant="contained"
          disabled={!gridDirty || isSaving}
          onClick={() => void saveGridSize()}
          sx={{ mt: 1, fontSize: 12 }}
          fullWidth
        >
          {isSaving ? 'Saving…' : 'Apply'}
        </Button>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)' }} />

      {/* Danger zone */}
      <Box sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
        <Button size="small" color="error" variant="outlined" fullWidth onClick={() => setDeleteDialogOpen(true)} sx={{ fontSize: 12 }}>
          Delete group
        </Button>
      </Box>

      <DeleteGroupDialog
        open={deleteDialogOpen}
        group={group}
        maps={maps}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  )
}
