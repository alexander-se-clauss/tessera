import AddIcon from '@mui/icons-material/Add'
import AdjustIcon from '@mui/icons-material/Adjust'
import ArrowRightIcon from '@mui/icons-material/ArrowRight'
import CloseIcon from '@mui/icons-material/Close'
import ColorizeIcon from '@mui/icons-material/Colorize'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PanToolIcon from '@mui/icons-material/PanTool'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RemoveIcon from '@mui/icons-material/Remove'
import StopIcon from '@mui/icons-material/Stop'
import ViewModuleIcon from '@mui/icons-material/ViewModule'
import WidgetsIcon from '@mui/icons-material/Widgets'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { ExtractedTile, TileRef, TileType } from '../../model/types'
import {
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarLabel,
  EditorToolbarSeparator,
} from '../../components/EditorToolbar'
import { useCanvasViewport } from '../../hooks/useCanvasViewport'
import type { AnimationFrameRef, GroupDraft, ObjectStateDraftDef, ObjectStateTransitionDraft, TileHitbox, TileOverride, TilesetOrganizeCollisionStepProps } from './types'

const TERRAIN_TILE_TYPE_OPTIONS: TileType[] = ['floor', 'wall', 'water']
const TILE_SIZE = 16
const TILE_GRID_COLUMNS = 12
const TILE_GRID_CELL = 48
const TILE_GRID_GAP = 10
const TILE_GRID_WIDTH = TILE_GRID_COLUMNS * TILE_GRID_CELL + (TILE_GRID_COLUMNS - 1) * TILE_GRID_GAP
const LAYOUT_CELL = 56
const LAYOUT_GAP = 8
const TILE_PREVIEW_EDITOR_SIZE = 256
const EMPTY_STATE_TILE_INDEX = -1
const MASK_PRESETS = [
  'full',
  'top',
  'bottom',
  'left',
  'right',
  'center',
  'cornerTl',
  'cornerTr',
  'cornerBl',
  'cornerBr',
  'notCornerTl',
  'notCornerTr',
  'notCornerBl',
  'notCornerBr',
  'custom',
] as const
type MaskPreset = typeof MASK_PRESETS[number]
type PixelEditMode = 'delete' | 'color'
type LayoutTileContextMenuState = {
  tileId: number
  groupId: string
  x: number
  y: number
  mobile: boolean
} | null
type LayoutTileMenuMode = 'root' | 'move' | 'moveTileset' | 'duplicate'

export function TilesetOrganizeCollisionStep({
  allTiles,
  approvedTiles,
  sourceImageUrl,
  sourceImageWidth = 0,
  sourceImageHeight = 0,
  sourceGridW = TILE_SIZE,
  sourceGridH = TILE_SIZE,
  importWorkspace = false,
  hasTargetTileset = true,
  sourceToolbarContent,
  targetSelector,
  crossTilesetTargets = [],
  onToggleSourceRegion,
  onCreateSourceRegionTile,
  activeGroup,
  groups,
  newGroupName,
  setNewGroupName,
  organizeSelectedTileIds,
  selectedLayoutTileId,
  draggedLayoutItem,
  onSetActiveGroupId,
  onSetSelectedLayoutTileId,
  onSetDraggedLayoutItem,
  onToggleTile,
  onAddGroup,
  onDeleteGroup,
  onAssignSelectedToGroup,
  onUpdateGroupDimension,
  onUpdateGroupTileType,
  onUpdateGroupMeta,
  onUpdateTileOverride,
  onAppendAnimationFrame,
  onMoveLayoutItem,
  onRemoveTileFromGroup,
  onMoveTileToGroup,
  onMoveTileToTilesetGroup,
  onDuplicateTileToGroup,
  onRemoveTileFromSpecificGroup,
}: TilesetOrganizeCollisionStepProps) {
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const assignedTileIds = useMemo(
    () => new Set(groups.flatMap((group) => group.tileRefs.map((ref) => ref.tileId))),
    [groups],
  )

  const unassignedTiles = useMemo(
    () => approvedTiles.filter((tile) => !assignedTileIds.has(tile.id)),
    [approvedTiles, assignedTileIds],
  )
  const sourceTiles = unassignedTiles

  const selectedTile = selectedLayoutTileId != null ? allTiles.find((tile) => tile.id === selectedLayoutTileId) ?? null : null
  const tileOverrides = ((activeGroup?.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)
  const tileOverride = selectedLayoutTileId != null ? tileOverrides[String(selectedLayoutTileId)] ?? {} : {}
  const effectiveType = (tileOverride.tileType ?? activeGroup?.metadata.tileType ?? 'floor') as TileType
  const defaultCollision = String(activeGroup?.metadata.defaultCollision ?? ((activeGroup?.metadata.solid ?? false) ? 'solid' : 'none'))
  const effectiveSolid = (tileOverride.solid ?? (defaultCollision === 'solid')) as boolean
  const [animationFramePickerTileId, setAnimationFramePickerTileId] = useState<number | null>(null)
  const [stateSpritePickerIdx, setStateSpritePickerIdx] = useState<number | null>(null)
  const [layoutContextMenu, setLayoutContextMenu] = useState<LayoutTileContextMenuState>(null)
  const [layoutMenuMode, setLayoutMenuMode] = useState<LayoutTileMenuMode>('root')
  const [pendingLastTileRemoval, setPendingLastTileRemoval] = useState<{ tileId: number; group: GroupDraft } | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [flashGroupId, setFlashGroupId] = useState<string | null>(null)
  const [fadingTileId, setFadingTileId] = useState<number | null>(null)

  const framesForOverride = (override: TileOverride | undefined, baseTile: ExtractedTile | null): AnimationFrameRef[] => {
    const baseFrame = baseTile ? { tileId: baseTile.id, tileIndex: baseTile.index, x: 0, y: 0 } : null
    if (override?.animationFrames?.length) {
      return baseFrame && override.animationFrames[0]?.tileId !== baseFrame.tileId
        ? [baseFrame, ...override.animationFrames.filter((frame) => frame.tileId !== baseFrame.tileId)]
        : override.animationFrames
    }
    const legacyFrameIds = override?.animationFrameTileIds ?? []
    const frameIds = baseTile
      ? [baseTile.id, ...legacyFrameIds.filter((tileId) => tileId !== baseTile.id)]
      : legacyFrameIds
    return frameIds
      .map((tileId) => {
        const tile = allTiles.find((candidate) => candidate.id === tileId)
        return tile ? { tileId, tileIndex: tile.index, x: 0, y: 0 } : null
      })
      .filter((frame): frame is AnimationFrameRef => frame != null)
  }

  const appendAnimationFrameTile = (frameTile: ExtractedTile) => {
    if (animationFramePickerTileId == null || !activeGroup) return
    const baseTile = allTiles.find((tile) => tile.id === animationFramePickerTileId) ?? null
    const override = tileOverrides[String(animationFramePickerTileId)] ?? {}
    const frame = { tileId: frameTile.id, tileIndex: frameTile.index, x: 0, y: 0 }
    if (onAppendAnimationFrame) {
      onAppendAnimationFrame(animationFramePickerTileId, activeGroup.id, frame)
      return
    }
    const frames = [
      ...framesForOverride(override, baseTile),
      frame,
    ]
    onUpdateTileOverride(animationFramePickerTileId, activeGroup.id, {
      animationFrames: frames,
      animationFrameTileIds: frames.map((frame) => frame.tileId),
      animationFrameDuration: Number(override.animationFrameDuration ?? 120),
      animationLoop: true,
    })
  }

  const pickStateSpriteTile = (tile: ExtractedTile) => {
    if (stateSpritePickerIdx == null || !activeGroup) return
    const defs = (activeGroup.metadata.stateDefs ?? []) as ObjectStateDraftDef[]
    onUpdateGroupMeta(activeGroup.id, 'stateDefs', defs.map((s, i) => i === stateSpritePickerIdx ? { ...s, sprite: { ...s.sprite, tileIndex: tile.index, x: s.sprite.x ?? 0, y: s.sprite.y ?? 0 } } : s))
    setStateSpritePickerIdx(null)
  }

  const handleLayoutTileSelect = (tileId: number | null) => {
    onSetSelectedLayoutTileId(tileId)
  }

  const showToast = (message: string) => {
    setToastMessage(message)
  }

  const flashGroup = (groupId: string) => {
    setFlashGroupId(groupId)
    window.setTimeout(() => setFlashGroupId((current) => (current === groupId ? null : current)), 300)
  }

  const closeLayoutContextMenu = () => {
    setLayoutContextMenu(null)
    setLayoutMenuMode('root')
  }

  const handleMoveTileToGroup = (targetGroupId: string) => {
    if (!layoutContextMenu) return
    const targetGroup = groups.find((group) => group.id === targetGroupId)
    if (!targetGroup) return
    onMoveTileToGroup(layoutContextMenu.tileId, layoutContextMenu.groupId, targetGroupId)
    flashGroup(targetGroupId)
    showToast(`Moved to ${targetGroup.name}`)
    closeLayoutContextMenu()
  }

  const handleMoveTileToTilesetGroup = (targetTilesetId: number, targetGroupId: string) => {
    if (!layoutContextMenu || !onMoveTileToTilesetGroup) return
    const target = crossTilesetTargets
      .flatMap((tileset) => tileset.groups.map((group) => ({ tileset, group })))
      .find((candidate) => candidate.tileset.tilesetId === targetTilesetId && candidate.group.id === targetGroupId)
    if (!target) return
    onMoveTileToTilesetGroup(layoutContextMenu.tileId, layoutContextMenu.groupId, targetTilesetId, targetGroupId)
    showToast(`Moved to ${target.tileset.tilesetName} / ${target.group.name}`)
    closeLayoutContextMenu()
  }

  const handleDuplicateTileToGroup = (targetGroupId: string) => {
    if (!layoutContextMenu) return
    const targetGroup = groups.find((group) => group.id === targetGroupId)
    if (!targetGroup) return
    onDuplicateTileToGroup(layoutContextMenu.tileId, layoutContextMenu.groupId, targetGroupId)
    flashGroup(targetGroupId)
    showToast(`Duplicated to ${targetGroup.name}`)
    closeLayoutContextMenu()
  }

  const removeContextTile = (tileId: number, group: GroupDraft) => {
    setFadingTileId(tileId)
    window.setTimeout(() => {
      onRemoveTileFromSpecificGroup(tileId, group.id)
      setFadingTileId((current) => (current === tileId ? null : current))
      showToast(`Removed from ${group.name}`)
    }, 200)
  }

  const handleRemoveContextTile = () => {
    if (!layoutContextMenu) return
    const group = groups.find((candidate) => candidate.id === layoutContextMenu.groupId)
    if (!group) return
    if (group.tileRefs.length === 1) {
      setPendingLastTileRemoval({ tileId: layoutContextMenu.tileId, group })
      closeLayoutContextMenu()
      return
    }
    removeContextTile(layoutContextMenu.tileId, group)
    closeLayoutContextMenu()
  }

  const contextMenuGroup = layoutContextMenu ? groups.find((group) => group.id === layoutContextMenu.groupId) ?? null : null
  const contextMenuTile = layoutContextMenu ? allTiles.find((tile) => tile.id === layoutContextMenu.tileId) ?? null : null
  const contextMenuTargetGroups = contextMenuGroup ? groups.filter((group) => group.id !== contextMenuGroup.id) : []

  return (
    <>
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          lg: importWorkspace ? 'minmax(0, 1fr) minmax(0, 350px)' : '280px minmax(0, 1fr) minmax(0, 350px)',
        },
        gap: 0,
        flex: 1,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {!importWorkspace ? (
        <Box sx={{ minWidth: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', pb: 4, borderRight: '1px solid rgba(255,255,255,0.06)', pl: 1.5, pr: 1, pt: 1.5 }}>
          <TileGroupList
            groups={groups}
            activeGroupId={activeGroup?.id ?? null}
            unassignedCount={unassignedTiles.length}
            newGroupName={newGroupName}
            isCreatingGroup={isCreatingGroup}
            onSetIsCreatingGroup={setIsCreatingGroup}
            onSetNewGroupName={setNewGroupName}
            onSetActiveGroupId={onSetActiveGroupId}
            onAddGroup={() => {
              onAddGroup()
              setIsCreatingGroup(false)
            }}
            onDeleteGroup={onDeleteGroup}
          />
        </Box>
      ) : null}

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 2,
          overflowY: importWorkspace ? 'hidden' : 'auto',
          overflowX: 'hidden',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          p: 2,
        }}
      >
        {sourceImageUrl && onToggleSourceRegion ? (
          <SourceRegionPanel
            toolbarContent={sourceToolbarContent}
            imageUrl={sourceImageUrl}
            imageWidth={sourceImageWidth}
            imageHeight={sourceImageHeight}
            gridW={sourceGridW}
            gridH={sourceGridH}
            tiles={approvedTiles}
            selectedTileIds={organizeSelectedTileIds}
            isPickingAnimationFrame={animationFramePickerTileId != null || stateSpritePickerIdx != null}
            onToggleSourceRegion={onToggleSourceRegion}
            onPickAnimationFrameRegion={(region) => {
              const tile = onCreateSourceRegionTile?.(region)
              if (!tile) return
              if (stateSpritePickerIdx != null) { pickStateSpriteTile(tile); return }
              appendAnimationFrameTile(tile)
              setAnimationFramePickerTileId(null)
            }}
            onAssignSelected={onAssignSelectedToGroup}
            assignDisabled={!activeGroup || organizeSelectedTileIds.length === 0}
          />
        ) : (
          importWorkspace ? (
            <EmptySourceCanvas toolbarContent={sourceToolbarContent} />
          ) : (
            <TileGridPanel
              tiles={sourceTiles}
              selectedTileIds={organizeSelectedTileIds}
              tileWidth={sourceGridW}
              tileHeight={sourceGridH}
              isPickingAnimationFrame={animationFramePickerTileId != null || stateSpritePickerIdx != null}
              onToggleTile={onToggleTile}
              onPickAnimationFrameTile={(tileId) => {
                const tile = allTiles.find((candidate) => candidate.id === tileId)
                if (!tile) return
                if (stateSpritePickerIdx != null) { pickStateSpriteTile(tile); return }
                appendAnimationFrameTile(tile)
                setAnimationFramePickerTileId(null)
              }}
              onAssignSelected={onAssignSelectedToGroup}
              assignDisabled={!activeGroup || organizeSelectedTileIds.length === 0}
            />
          )
        )}

      </Box>

      <Box
        sx={{
          minWidth: 0,
          minHeight: 0,
          width: 'auto',
          maxWidth: '100%',
          height: '100%',
          maxHeight: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 3,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 2,
          '& > *': {
            minWidth: 0,
            maxWidth: '100%',
            width: '100%',
            flexShrink: 0,
          },
        }}
      >
        {importWorkspace && !hasTargetTileset ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Select a tileset to edit.
          </Typography>
        ) : (
          <>
            {targetSelector}
            <GroupPropertiesPanel
              activeGroup={activeGroup}
              onUpdateGroupDimension={onUpdateGroupDimension}
              onUpdateGroupTileType={onUpdateGroupTileType}
              onDeleteGroup={onDeleteGroup}
            />
            <TileLayoutPreview
              activeGroup={activeGroup}
              groups={groups}
              tiles={allTiles}
              selectedTileId={selectedLayoutTileId}
              draggedItem={draggedLayoutItem}
              tileOverrides={tileOverrides}
              sourceImageUrl={sourceImageUrl}
              tileWidth={sourceGridW}
              tileHeight={sourceGridH}
              highlightedTileId={layoutContextMenu?.tileId ?? null}
              fadingTileId={fadingTileId}
              flashActive={activeGroup?.id === flashGroupId}
              onSetSelectedTileId={handleLayoutTileSelect}
              onSetDraggedLayoutItem={onSetDraggedLayoutItem}
              onMoveLayoutItem={onMoveLayoutItem}
              onRemoveTile={onRemoveTileFromGroup}
              onOpenContextMenu={(tileId, event, mobile = false, groupId) => {
                const targetGroupId = groupId ?? activeGroup?.id
                if (!targetGroupId) return
                setLayoutContextMenu({
                  tileId,
                  groupId: targetGroupId,
                  x: mobile ? window.innerWidth / 2 : event.clientX,
                  y: mobile ? window.innerHeight / 2 : event.clientY,
                  mobile,
                })
                setLayoutMenuMode('root')
              }}
            />
            <TileCollisionEditor
              selectedTile={selectedTile}
              selectedTileId={selectedLayoutTileId}
              allTiles={allTiles}
              activeGroup={activeGroup}
              sourceImageUrl={sourceImageUrl}
              tileWidth={sourceGridW}
              tileHeight={sourceGridH}
              effectiveType={effectiveType}
              effectiveSolid={effectiveSolid}
              isPickingAnimationFrame={animationFramePickerTileId === selectedLayoutTileId}
              onStartAnimationFramePick={() => {
                if (selectedLayoutTileId != null) setAnimationFramePickerTileId(selectedLayoutTileId)
              }}
              onUpdateTileOverride={onUpdateTileOverride}
              onUpdateGroupMeta={onUpdateGroupMeta}
              stateSpritePickerIdx={stateSpritePickerIdx}
              onStartStateSpritePick={(idx) => setStateSpritePickerIdx(idx)}
            />
          </>
        )}
      </Box>
    </Box>
    <LayoutTileContextMenu
      open={layoutContextMenu != null && contextMenuGroup != null && contextMenuTile != null}
      state={layoutContextMenu}
      mode={layoutMenuMode}
      group={contextMenuGroup}
      targetGroups={contextMenuTargetGroups}
      crossTilesetTargets={crossTilesetTargets}
      onModeChange={setLayoutMenuMode}
      onClose={closeLayoutContextMenu}
      onMove={handleMoveTileToGroup}
      onMoveToTileset={handleMoveTileToTilesetGroup}
      onDuplicate={handleDuplicateTileToGroup}
      onRemove={handleRemoveContextTile}
    />
    <Dialog
      open={pendingLastTileRemoval != null}
      onClose={() => setPendingLastTileRemoval(null)}
      slotProps={{ paper: { sx: { bgcolor: '#1a1f26', color: '#d6dee8', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ fontSize: 16 }}>Remove last tile?</DialogTitle>
      <DialogContent sx={{ fontSize: 13, color: '#8f9baa' }}>
        This will empty the {pendingLastTileRemoval?.group.name} group. Continue?
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setPendingLastTileRemoval(null)} sx={miniActionSx}>Cancel</Button>
        <Button
          onClick={() => {
            if (pendingLastTileRemoval) removeContextTile(pendingLastTileRemoval.tileId, pendingLastTileRemoval.group)
            setPendingLastTileRemoval(null)
          }}
          sx={{ ...miniActionSx, color: '#E24B4A', borderColor: 'rgba(226,75,74,0.35)' }}
        >
          Remove
        </Button>
      </DialogActions>
    </Dialog>
    <Snackbar
      open={Boolean(toastMessage)}
      message={toastMessage}
      autoHideDuration={2000}
      onClose={() => setToastMessage('')}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      slotProps={{ content: { sx: { bgcolor: '#1a1f26', color: '#d6dee8', border: '1px solid rgba(255,255,255,0.10)' } } }}
    />
    </>
  )
}

function LayoutTileContextMenu({
  open,
  state,
  mode,
  group,
  targetGroups,
  crossTilesetTargets,
  onModeChange,
  onClose,
  onMove,
  onMoveToTileset,
  onDuplicate,
  onRemove,
}: {
  open: boolean
  state: LayoutTileContextMenuState
  mode: LayoutTileMenuMode
  group: GroupDraft | null
  targetGroups: GroupDraft[]
  crossTilesetTargets: Array<{ tilesetId: number; tilesetName: string; groups: Array<{ id: string; name: string; width: number; height: number }> }>
  onModeChange: (mode: LayoutTileMenuMode) => void
  onClose: () => void
  onMove: (targetGroupId: string) => void
  onMoveToTileset: (targetTilesetId: number, targetGroupId: string) => void
  onDuplicate: (targetGroupId: string) => void
  onRemove: () => void
}) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const hasTargets = targetGroups.length > 0
  const crossTargets = crossTilesetTargets.flatMap((tileset) => tileset.groups.map((targetGroup) => ({ tileset, group: targetGroup })))
  const hasCrossTargets = crossTargets.length > 0
  const isMobile = Boolean(state?.mobile)

  useEffect(() => {
    if (!open) return undefined
    setActiveIndex(0)
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      onClose()
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key === 'ArrowLeft') {
        if (mode !== 'root') onModeChange('root')
        return
      }
      if (event.key === 'ArrowRight' && mode === 'root') {
        if (activeIndex === 0 && hasTargets) onModeChange('move')
        if (activeIndex === 1 && hasCrossTargets) onModeChange('moveTileset')
        if (activeIndex === 2 && hasTargets) onModeChange('duplicate')
        return
      }
      const maxIndex = mode === 'root' ? 3 : mode === 'moveTileset' ? crossTargets.length - 1 : targetGroups.length - 1
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setActiveIndex((current) => Math.min(maxIndex, current + 1))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setActiveIndex((current) => Math.max(0, current - 1))
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        if (mode === 'root') {
          if (activeIndex === 0 && hasTargets) onModeChange('move')
          else if (activeIndex === 1 && hasCrossTargets) onModeChange('moveTileset')
          else if (activeIndex === 2 && hasTargets) onModeChange('duplicate')
          else if (activeIndex === 3) onRemove()
          return
        }
        if (mode === 'moveTileset') {
          const target = crossTargets[activeIndex]
          if (target) onMoveToTileset(target.tileset.tilesetId, target.group.id)
          return
        }
        const target = targetGroups[activeIndex]
        if (!target) return
        if (mode === 'move') onMove(target.id)
        else onDuplicate(target.id)
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeIndex, crossTargets, hasCrossTargets, hasTargets, mode, onClose, onDuplicate, onModeChange, onMove, onMoveToTileset, onRemove, open, targetGroups])

  if (!open || !state || !group) return null

  const left = isMobile ? '50%' : mode === 'root' ? state.x : Math.min(window.innerWidth - 204, state.x + 188)
  const top = isMobile ? '50%' : state.y
  const transform = isMobile ? 'translate(-50%, -50%)' : 'translateY(-4px)'
  const itemHeight = isMobile ? 40 : 32
  const menuSx: SxProps<Theme> = {
    position: 'fixed',
    left,
    top,
    transform,
    zIndex: 5000,
    minWidth: 184,
    p: '4px',
    bgcolor: '#1a1f26',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    animation: 'tile-context-menu-in 100ms ease-out',
    '@keyframes tile-context-menu-in': {
      from: { opacity: 0, transform: isMobile ? 'translate(-50%, calc(-50% + 4px))' : 'translateY(4px)' },
      to: { opacity: 1, transform },
    },
  }
  const menuItemSx = (active: boolean, danger = false, disabled = false): SxProps<Theme> => ({
    height: itemHeight,
    px: 1.5,
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    borderRadius: '6px',
    color: danger ? '#E24B4A' : '#d6dee8',
    fontSize: 13,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    bgcolor: active && !disabled ? 'rgba(255,255,255,0.08)' : 'transparent',
    '&:hover': disabled ? {} : { bgcolor: 'rgba(255,255,255,0.08)' },
  })

  const content = mode === 'root' ? (
    <>
      <Tooltip title={hasTargets ? '' : 'No other groups'} placement="right">
        <Box
          onMouseEnter={() => setActiveIndex(0)}
          onClick={() => { if (hasTargets) onModeChange('move') }}
          sx={menuItemSx(activeIndex === 0, false, !hasTargets)}
        >
          <ArrowRightIcon sx={{ fontSize: 16 }} />
          <Box sx={{ flex: 1 }}>Move to...</Box>
          <ArrowRightIcon sx={{ fontSize: 16, opacity: hasTargets ? 0.75 : 0.35 }} />
        </Box>
      </Tooltip>
      <Tooltip title={hasTargets ? '' : 'No other groups'} placement="right">
        <Box
          onMouseEnter={() => setActiveIndex(1)}
          onClick={() => { if (hasCrossTargets) onModeChange('moveTileset') }}
          sx={menuItemSx(activeIndex === 1, false, !hasCrossTargets)}
        >
          <ArrowRightIcon sx={{ fontSize: 16 }} />
          <Box sx={{ flex: 1 }}>Move to tileset...</Box>
          <ArrowRightIcon sx={{ fontSize: 16, opacity: hasCrossTargets ? 0.75 : 0.35 }} />
        </Box>
      </Tooltip>
      <Tooltip title={hasTargets ? '' : 'No other groups'} placement="right">
        <Box
          onMouseEnter={() => setActiveIndex(2)}
          onClick={() => { if (hasTargets) onModeChange('duplicate') }}
          sx={menuItemSx(activeIndex === 2, false, !hasTargets)}
        >
          <ContentCopyIcon sx={{ fontSize: 16 }} />
          <Box sx={{ flex: 1 }}>Duplicate to...</Box>
          <ArrowRightIcon sx={{ fontSize: 16, opacity: hasTargets ? 0.75 : 0.35 }} />
        </Box>
      </Tooltip>
      <Box sx={{ height: 1, bgcolor: 'rgba(255,255,255,0.08)', my: 0.5 }} />
      <Box onMouseEnter={() => setActiveIndex(3)} onClick={onRemove} sx={menuItemSx(activeIndex === 3, true)}>
        <DeleteIcon sx={{ fontSize: 16 }} />
        <Box>Remove from group</Box>
      </Box>
    </>
  ) : mode === 'moveTileset' ? (
    <>
      {crossTargets.map((target, index) => (
        <Box
          key={`${target.tileset.tilesetId}:${target.group.id}`}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onMoveToTileset(target.tileset.tilesetId, target.group.id)}
          sx={menuItemSx(activeIndex === index)}
        >
          <ArrowRightIcon sx={{ fontSize: 16 }} />
          <Box>{target.tileset.tilesetName} / {target.group.name} ({target.group.width}x{target.group.height})</Box>
        </Box>
      ))}
    </>
  ) : (
    <>
      {targetGroups.map((target, index) => (
        <Box
          key={target.id}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => mode === 'move' ? onMove(target.id) : onDuplicate(target.id)}
          sx={menuItemSx(activeIndex === index)}
        >
          {mode === 'move' ? <ArrowRightIcon sx={{ fontSize: 16 }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
          <Box>{target.name} ({Number(target.metadata.width ?? 1)}x{Number(target.metadata.height ?? 1)})</Box>
        </Box>
      ))}
    </>
  )

  return createPortal(
    <Box ref={menuRef} sx={menuSx}>
      {content}
    </Box>,
    document.body,
  )
}

function TileGroupList({
  groups,
  activeGroupId,
  unassignedCount,
  newGroupName,
  isCreatingGroup,
  onSetIsCreatingGroup,
  onSetNewGroupName,
  onSetActiveGroupId,
  onAddGroup,
  onDeleteGroup,
}: {
  groups: GroupDraft[]
  activeGroupId: string | null
  unassignedCount: number
  newGroupName: string
  isCreatingGroup: boolean
  onSetIsCreatingGroup: (value: boolean) => void
  onSetNewGroupName: (value: string) => void
  onSetActiveGroupId: (groupId: string | null) => void
  onAddGroup: () => void
  onDeleteGroup: (groupId: string) => void
}) {
  return (
    <Box sx={{ minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Groups
        </Typography>
        <Tooltip title="Add group">
          <IconButton
            size="small"
            onClick={() => onSetIsCreatingGroup(!isCreatingGroup)}
            sx={{ color: '#8b949e', '&:hover': { color: '#e6edf3', background: 'rgba(255,255,255,0.04)' } }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {groups.map((group) => {
          const tileCount = group.tileRefs.length
          const typeLabel = String(group.metadata.tileType ?? 'floor')
          const isObjectsGroup = String(group.metadata.systemRole) === 'objects' || group.name === 'Objects'
          return (
            <Box key={group.id} sx={groupRowSx(group.id === activeGroupId)}>
              <Box
                onClick={() => onSetActiveGroupId(group.id)}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0, cursor: 'pointer' }}
              >
                {isObjectsGroup ? (
                  <WidgetsIcon sx={{ fontSize: 15, color: '#5d9eff', flexShrink: 0 }} />
                ) : (
                  <Box sx={{ width: 8, height: 8, borderRadius: '999px', bgcolor: colorForType(typeLabel), flexShrink: 0 }} />
                )}
                <Typography sx={{ fontSize: 14, fontWeight: isObjectsGroup ? 650 : 500, color: isObjectsGroup ? '#b6d7ff' : group.id === activeGroupId ? '#e6edf3' : '#8b949e', minWidth: 0, flex: 1 }} noWrap>
                  {group.name}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(220,230,245,0.5)' }}>{capitalize(typeLabel)}</Typography>
                <Typography sx={{ fontSize: 12, color: '#6a737d' }}>{tileCount}</Typography>
              </Box>
              {!isObjectsGroup ? <Tooltip title="Delete group">
                <IconButton
                  size="small"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteGroup(group.id)
                  }}
                  sx={{ color: '#6a737d', '&:hover': { color: '#ff7b72', background: 'rgba(255,255,255,0.04)' } }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip> : null}
            </Box>
          )
        })}

        {isCreatingGroup ? (
          <Box sx={{ display: 'flex', gap: 1, px: 1.25, py: 0.5 }}>
            <TextField
              autoFocus
              placeholder="New group name"
              variant="standard"
              size="small"
              value={newGroupName}
              onChange={(event) => onSetNewGroupName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  onAddGroup()
                }
                if (event.key === 'Escape') {
                  onSetIsCreatingGroup(false)
                }
              }}
              sx={{ ...inspectorFieldSx, flex: 1 }}
            />
            <Button onClick={onAddGroup} sx={miniActionSx}>Add</Button>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 0.75, pt: 2 }}>
        <Box
          sx={groupRowSx(true)}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '999px', bgcolor: '#6a737d', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: '#e6edf3', flex: 1 }}>
            Unassigned
          </Typography>
          <Typography sx={{ fontSize: 12, color: '#6a737d' }}>{unassignedCount}</Typography>
        </Box>

      </Box>
    </Box>
  )
}

function TileGridPanel({
  tiles,
  selectedTileIds,
  tileWidth,
  tileHeight,
  isPickingAnimationFrame,
  onToggleTile,
  onPickAnimationFrameTile,
  onAssignSelected,
  assignDisabled,
}: {
  tiles: ExtractedTile[]
  selectedTileIds: number[]
  tileWidth: number
  tileHeight: number
  isPickingAnimationFrame: boolean
  onToggleTile: (tileId: number) => void
  onPickAnimationFrameTile: (tileId: number) => void
  onAssignSelected: () => void
  assignDisabled: boolean
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, width: `${TILE_GRID_WIDTH}px`, maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <EditorToolbar>
          <Tooltip title="Assign selected">
            <Box sx={{ display: 'inline-flex' }}>
              <EditorToolbarButton icon={<AdjustIcon />} label="Assign selected" disabled={assignDisabled || selectedTileIds.length === 0} onClick={onAssignSelected} />
            </Box>
          </Tooltip>
        </EditorToolbar>
      </Box>
      <Box sx={{ width: 'fit-content', maxWidth: '100%', overflowX: 'auto', overflowY: 'hidden', pb: 0.5 }}>
        <TileGrid
          tiles={tiles}
          selectedTileIds={selectedTileIds}
          tileWidth={tileWidth}
          tileHeight={tileHeight}
          isPickingAnimationFrame={isPickingAnimationFrame}
          onToggleTile={onToggleTile}
          onPickAnimationFrameTile={onPickAnimationFrameTile}
        />
      </Box>
    </Box>
  )
}

function EmptySourceCanvas({ toolbarContent }: { toolbarContent?: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: '100%', minHeight: 0, flex: 1 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', width: '100%', flexShrink: 0, columnGap: 1.5 }}>
        <EditorToolbar sx={{ width: '100%', justifyContent: 'flex-start', minHeight: 40, py: 0 }}>
          {toolbarContent}
        </EditorToolbar>
      </Box>
      <Box
        sx={{
          flex: 1,
          minHeight: 360,
          display: 'grid',
          placeItems: 'center',
          color: '#667383',
          fontSize: 13,
          border: '1px dashed rgba(255,255,255,0.08)',
          bgcolor: '#080c12',
          backgroundImage: `
            linear-gradient(45deg, #0d1118 25%, transparent 25%),
            linear-gradient(-45deg, #0d1118 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #0d1118 75%),
            linear-gradient(-45deg, transparent 75%, #0d1118 75%)
          `,
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
        }}
      >
        Choose a PNG to start importing tiles.
      </Box>
    </Box>
  )
}

function SourceRegionPanel({
  toolbarContent,
  imageUrl,
  imageWidth,
  imageHeight,
  gridW,
  gridH,
  tiles,
  selectedTileIds,
  isPickingAnimationFrame,
  onToggleSourceRegion,
  onPickAnimationFrameRegion,
  onAssignSelected,
  assignDisabled,
  hideAssignButton = false,
}: {
  toolbarContent?: ReactNode
  imageUrl: string
  imageWidth: number
  imageHeight: number
  gridW: number
  gridH: number
  tiles: ExtractedTile[]
  selectedTileIds: number[]
  isPickingAnimationFrame: boolean
  onToggleSourceRegion: (regions: Array<{ sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }>) => void
  onPickAnimationFrameRegion: (region: { sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }) => void
  onAssignSelected: () => void
  assignDisabled: boolean
  hideAssignButton?: boolean
}) {
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [matrixCols, setMatrixCols] = useState(1)
  const [matrixRows, setMatrixRows] = useState(1)
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; y: number } | null>(null)
  const [panMode, setPanMode] = useState(false)
  const [matrixDragging, setMatrixDragging] = useState(false)
  const {
    viewportRef,
    zoom,
    panX,
    panY,
    panning,
    fitToView,
    updateZoom,
    clientToContentPoint,
    startPan,
    movePan,
    stopPan,
    handleWheelZoom,
  } = useCanvasViewport({ contentWidth: imageWidth, contentHeight: imageHeight })
  const matrixW = Math.max(1, matrixCols) * gridW
  const matrixH = Math.max(1, matrixRows) * gridH

  const cropRegion = (sourceX: number, sourceY: number, width = gridW, height = gridH) => {
    const image = imageRef.current
    if (!image) return ''
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return ''
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(image, sourceX, sourceY, width, height, 0, 0, width, height)
    return canvas.toDataURL('image/png')
  }

  const anchorFromMouse = (event: MouseEvent<HTMLDivElement>) => {
    const point = imagePointFromMouse(event)
    if (!point) return null
    const maxX = Math.max(0, imageWidth - matrixW)
    const maxY = Math.max(0, imageHeight - matrixH)
    return {
      x: Math.max(0, Math.min(maxX, point.x)),
      y: Math.max(0, Math.min(maxY, point.y)),
    }
  }

  const singleTileAnchorFromMouse = (event: MouseEvent<HTMLDivElement>) => {
    const point = imagePointFromMouse(event)
    if (!point) return null
    return {
      x: Math.max(0, Math.min(Math.max(0, imageWidth - gridW), point.x)),
      y: Math.max(0, Math.min(Math.max(0, imageHeight - gridH), point.y)),
    }
  }

  const imagePointFromMouse = (event: MouseEvent<HTMLDivElement>) => {
    const point = clientToContentPoint(event.clientX, event.clientY)
    if (!point) return null
    const x = Math.floor(point.x)
    const y = Math.floor(point.y)
    if (x < 0 || y < 0 || x >= imageWidth || y >= imageHeight) return null
    return { x, y }
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    if (panMode || panning) return
    if (isPickingAnimationFrame) {
      const anchor = singleTileAnchorFromMouse(event)
      if (!anchor) return
      onPickAnimationFrameRegion({ sourceX: anchor.x, sourceY: anchor.y, width: gridW, height: gridH, imageUrl: cropRegion(anchor.x, anchor.y) })
      return
    }
    const anchor = anchorFromMouse(event)
    if (!anchor) return
    const regions: Array<{ sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }> = []
    for (let row = 0; row < matrixRows; row += 1) {
      for (let col = 0; col < matrixCols; col += 1) {
        const sourceX = anchor.x + col * gridW
        const sourceY = anchor.y + row * gridH
        regions.push({ sourceX, sourceY, width: gridW, height: gridH, imageUrl: cropRegion(sourceX, sourceY) })
      }
    }
    onToggleSourceRegion(regions)
  }

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!panMode && event.button === 0 && !isPickingAnimationFrame) {
      event.preventDefault()
      setMatrixDragging(true)
      setHoverAnchor(anchorFromMouse(event))
      return
    }
    if (!panMode && event.button !== 2) return
    startPan(event)
  }

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (movePan(event)) {
      return
    }
    if (matrixDragging) {
      setHoverAnchor(anchorFromMouse(event))
      return
    }
    setHoverAnchor(isPickingAnimationFrame ? singleTileAnchorFromMouse(event) : anchorFromMouse(event))
  }

  const handleMouseUp = () => {
    setMatrixDragging(false)
    stopPan()
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%', maxWidth: '100%', minHeight: 0, flex: 1 }}>
      {isPickingAnimationFrame ? (
        <Typography sx={{ fontSize: 11, color: '#378ADD', textAlign: 'center' }}>
          Click a tile to add to animation sequence
        </Typography>
      ) : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: toolbarContent ? 'auto minmax(0, 1fr)' : '1fr', alignItems: 'center', width: '100%', flexShrink: 0, columnGap: 1.5 }}>
        {toolbarContent ? (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
            {toolbarContent}
          </Box>
        ) : null}
        <EditorToolbar sx={{ justifySelf: 'center', maxWidth: '100%', overflowX: 'auto', minHeight: 40, py: 0 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <Typography sx={{ fontSize: 11, color: '#8b949e', whiteSpace: 'nowrap' }}>Matrix</Typography>
            <TextField
              type="number"
              size="small"
              value={matrixCols}
              onChange={(event) => setMatrixCols(Math.max(1, Math.min(32, Number(event.target.value) || 1)))}
              slotProps={{ input: { inputProps: { min: 1, max: 32, step: 1 } } }}
              sx={toolbarNumberFieldSx}
            />
            <Typography sx={{ fontSize: 11, color: '#667383' }}>x</Typography>
            <TextField
              type="number"
              size="small"
              value={matrixRows}
              onChange={(event) => setMatrixRows(Math.max(1, Math.min(32, Number(event.target.value) || 1)))}
              slotProps={{ input: { inputProps: { min: 1, max: 32, step: 1 } } }}
              sx={toolbarNumberFieldSx}
            />
          </Box>

          <EditorToolbarSeparator />

          <Box sx={{ display: 'flex' }}>
            <Tooltip title="Pan">
              <Box sx={{ display: 'inline-flex' }}>
                <EditorToolbarButton icon={<PanToolIcon />} label="Pan" active={panMode} onClick={() => setPanMode((current) => !current)} />
              </Box>
            </Tooltip>
          </Box>

          <EditorToolbarSeparator />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Tooltip title="Zoom out">
              <Box sx={{ display: 'inline-flex' }}>
                <EditorToolbarButton icon={<RemoveIcon />} label="Zoom out" onClick={() => updateZoom(zoom - 0.25)} />
              </Box>
            </Tooltip>
            <EditorToolbarLabel text={`${Math.round(zoom * 100)}%`} width={72} />
            <Tooltip title="Zoom in">
              <Box sx={{ display: 'inline-flex' }}>
                <EditorToolbarButton icon={<AddIcon />} label="Zoom in" onClick={() => updateZoom(zoom + 0.25)} />
              </Box>
            </Tooltip>
            <Tooltip title="Fit to view">
              <Box sx={{ display: 'inline-flex' }}>
                <EditorToolbarButton icon={<FitScreenIcon />} label="Fit to view" onClick={fitToView} />
              </Box>
            </Tooltip>
          </Box>

          {!hideAssignButton ? (
            <>
              <EditorToolbarSeparator />
              <Tooltip title="Assign selected">
                <Box sx={{ display: 'inline-flex' }}>
                  <EditorToolbarButton icon={<AdjustIcon />} label="Assign selected" disabled={assignDisabled || selectedTileIds.length === 0} onClick={onAssignSelected} />
                </Box>
              </Tooltip>
            </>
          ) : null}
        </EditorToolbar>
      </Box>
      <Box
        ref={viewportRef}
        onWheel={handleWheelZoom}
        onContextMenu={(event) => event.preventDefault()}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoverAnchor(null)
          handleMouseUp()
        }}
        sx={{ width: '100%', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', ...previewPatternSx }}
      >
        <Box
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          sx={{
            position: 'absolute',
            left: panX,
            top: panY,
            width: imageWidth,
            height: imageHeight,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            cursor: panning || matrixDragging ? 'grabbing' : panMode ? 'grab' : isPickingAnimationFrame ? 'copy' : 'crosshair',
          }}
        >
          <Box
            component="img"
            ref={imageRef}
            src={imageUrl}
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            sx={{ display: 'block', width: imageWidth, height: imageHeight, imageRendering: 'pixelated' }}
          />
          {hoverAnchor ? (
            <Box
              sx={{
                position: 'absolute',
                left: hoverAnchor.x,
                top: hoverAnchor.y,
                width: isPickingAnimationFrame ? gridW : matrixW,
                height: isPickingAnimationFrame ? gridH : matrixH,
                pointerEvents: 'none',
                bgcolor: isPickingAnimationFrame ? 'rgba(55,138,221,0.20)' : 'rgba(77,156,255,0.16)',
                outline: isPickingAnimationFrame ? '2px solid rgba(55,138,221,0.95)' : '2px solid rgba(77,156,255,0.85)',
                outlineOffset: -1,
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.45) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.45) 1px, transparent 1px)
                `,
                backgroundSize: `${gridW}px ${gridH}px`,
              }}
            />
          ) : null}
          {tiles.map((tile) => {
            const occurrence = tile.sourceOccurrences[0]
            if (!occurrence) return null
            const x = occurrence.x
            const y = occurrence.y
            const selected = selectedTileIds.includes(tile.id)
            if (!selected) return null
            return (
              <Box
                key={tile.id}
                sx={{
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: gridW,
                  height: gridH,
                  pointerEvents: 'none',
                  bgcolor: 'rgba(77,156,255,0.42)',
                  outline: '2px solid #4d9cff',
                  outlineOffset: -1,
                }}
              />
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}

export function TileLayoutPreview({
  activeGroup,
  groups,
  tiles,
  selectedTileId,
  draggedItem,
  tileOverrides,
  sourceImageUrl,
  tileWidth,
  tileHeight,
  highlightedTileId,
  fadingTileId,
  flashActive,
  onSetSelectedTileId,
  onSetDraggedLayoutItem,
  onMoveLayoutItem,
  onRemoveTile,
  onOpenContextMenu,
}: {
  activeGroup: GroupDraft | null
  groups: GroupDraft[]
  tiles: ExtractedTile[]
  selectedTileId: number | null
  draggedItem: { tileId: number | null; x: number; y: number } | null
  tileOverrides: Record<string, TileOverride>
  sourceImageUrl?: string
  tileWidth: number
  tileHeight: number
  highlightedTileId: number | null
  fadingTileId: number | null
  flashActive: boolean
  onSetSelectedTileId: (tileId: number | null) => void
  onSetDraggedLayoutItem: (item: { tileId: number | null; x: number; y: number } | null) => void
  onMoveLayoutItem: (source: { tileId: number | null; x: number; y: number }, target: { tileId: number | null; x: number; y: number }) => void
  onRemoveTile: (tileId: number) => void
  onOpenContextMenu: (tileId: number, event: MouseEvent<HTMLElement>, mobile?: boolean, groupId?: string) => void
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%', maxWidth: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Layout preview
        </Typography>
      </Box>
      {activeGroup ? (
        <Box
          sx={{
            overflowX: 'auto',
            overflowY: 'hidden',
            gap: 1.25,
            pb: 0.25,
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            border: flashActive ? '1px solid rgba(65,214,117,0.45)' : '1px solid transparent',
            boxShadow: flashActive ? '0 0 0 3px rgba(65,214,117,0.12)' : 'none',
            borderRadius: 1,
            transition: 'border-color 300ms ease, box-shadow 300ms ease',
          }}
        >
          <LayoutGrid
            tileRefs={activeGroup.tileRefs}
            tiles={tiles}
            width={Math.max(1, Number(activeGroup.metadata.width ?? 1))}
            height={Math.max(1, Number(activeGroup.metadata.height ?? 1))}
            draggedItem={draggedItem}
            selectedTileId={selectedTileId}
            tileOverrides={tileOverrides}
            sourceImageUrl={sourceImageUrl}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
            highlightedTileId={highlightedTileId}
            fadingTileId={fadingTileId}
            onDragStart={onSetDraggedLayoutItem}
            onDropItem={onMoveLayoutItem}
            onRemove={onRemoveTile}
            onSelectTile={onSetSelectedTileId}
            onOpenContextMenu={(tileId, event, mobile = false) => onOpenContextMenu(tileId, event, mobile, activeGroup.id)}
          />
        </Box>
      ) : (
        <EmptySurface message={groups.length > 0 ? 'This group is empty.' : 'Select or create a group to arrange its tiles.'} />
      )}
    </Box>
  )
}

function TileCollisionEditor({
  selectedTile,
  selectedTileId,
  allTiles,
  activeGroup,
  sourceImageUrl,
  tileWidth,
  tileHeight,
  effectiveType,
  effectiveSolid,
  isPickingAnimationFrame,
  onStartAnimationFramePick,
  onUpdateTileOverride,
  onUpdateGroupMeta,
  stateSpritePickerIdx,
  onStartStateSpritePick,
}: {
  selectedTile: ExtractedTile | null
  selectedTileId: number | null
  allTiles: ExtractedTile[]
  activeGroup: GroupDraft | null
  sourceImageUrl?: string
  tileWidth: number
  tileHeight: number
  effectiveType: TileType
  effectiveSolid: boolean
  isPickingAnimationFrame: boolean
  onStartAnimationFramePick: () => void
  onUpdateTileOverride: (tileId: number, groupId: string, updates: Partial<TileOverride>) => void
  onUpdateGroupMeta: (groupId: string, key: string, value: unknown) => void
  stateSpritePickerIdx: number | null
  onStartStateSpritePick: (stateIdx: number) => void
}) {
  const activeOverride = useMemo(
    () =>
      selectedTileId != null && activeGroup
        ? ((((activeGroup.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)[String(selectedTileId)] ?? {}) as TileOverride)
        : {},
    [activeGroup, selectedTileId],
  )
  const [selectedPreset, setSelectedPreset] = useState<MaskPreset>('full')
  const [dragPaint, setDragPaint] = useState<{
    anchorX: number
    anchorY: number
    mode: 'fill' | 'erase'
  } | null>(null)
  const mask = useMemo(
    () => buildEffectiveMask(tileOverrideCollisionMask(activeOverride), effectiveSolid),
    [activeOverride, effectiveSolid],
  )
  const collisionMode = activeOverride.collisionMask ? 'custom' : effectiveSolid ? 'solid' : 'nonSolid'
  const objectKind = activeOverride.objectKind ?? 'object'
  const sourceOffsetX = Number(activeOverride.sourceOffsetX ?? 0)
  const sourceOffsetY = Number(activeOverride.sourceOffsetY ?? 0)
  const blockedColors = activeOverride.blockedColors ?? []
  const deletedPixels = activeOverride.deletedPixels ?? []
  const isObjectsGroup = effectiveType === 'object' || String(activeGroup?.metadata.tileType) === 'object' || String(activeGroup?.metadata.systemRole) === 'objects' || activeGroup?.name === 'Objects'
  const animationFrames = useMemo<AnimationFrameRef[]>(() => {
    if (!selectedTile) return []
    const baseFrame: AnimationFrameRef = { tileId: selectedTile.id, tileIndex: selectedTile.index, x: 0, y: 0 }
    if (activeOverride.animationFrames?.length) {
      const storedFrames = activeOverride.animationFrames
      return storedFrames[0]?.tileId === selectedTile.id
        ? storedFrames
        : [baseFrame, ...storedFrames.filter((frame) => frame.tileId !== selectedTile.id)]
    }
    const legacyFrameIds = activeOverride.animationFrameTileIds ?? []
    const frameIds = legacyFrameIds.includes(selectedTile.id) ? legacyFrameIds : [selectedTile.id, ...legacyFrameIds]
    return frameIds
      .map((tileId) => {
        const tile = allTiles.find((candidate) => candidate.id === tileId)
        return tile ? { tileId, tileIndex: tile.index, x: 0, y: 0 } : null
      })
      .filter((frame): frame is AnimationFrameRef => frame != null)
  }, [activeOverride.animationFrameTileIds, activeOverride.animationFrames, allTiles, selectedTile])
  const [activeEditorTab, setActiveEditorTab] = useState<'pixels' | 'collision' | 'animation' | 'states'>('pixels')
  const [pixelEditMode, setPixelEditMode] = useState<PixelEditMode>('delete')
  const [isAnimationPreviewing, setIsAnimationPreviewing] = useState(false)
  const [previewFrameIndex, setPreviewFrameIndex] = useState(0)
  const [selectedAnimationFrameIndex, setSelectedAnimationFrameIndex] = useState<number | null>(null)
  const previousAnimationFrameCountRef = useRef(0)

  useEffect(() => {
    const storedMask = activeOverride.collisionMask ?? null
    if (!storedMask) {
      setSelectedPreset('full')
      return
    }
    const matched = (MASK_PRESETS.filter((p) => p !== 'custom') as Exclude<MaskPreset, 'custom'>[]).find((p) => {
      const pm = presetCollisionMask(p)
      return pm.every((row, y) => row.every((v, x) => v === Boolean(storedMask[y]?.[x])))
    })
    setSelectedPreset(matched ?? 'custom')
  }, [activeOverride.collisionMask, selectedTileId])

  useEffect(() => {
    if (!dragPaint) return
    const stopDragging = () => setDragPaint(null)
    window.addEventListener('mouseup', stopDragging)
    return () => window.removeEventListener('mouseup', stopDragging)
  }, [dragPaint])

  useEffect(() => {
    if (!isAnimationPreviewing || animationFrames.length === 0) return undefined
    const interval = window.setInterval(() => {
      setPreviewFrameIndex((current) => (current + 1) % animationFrames.length)
    }, Math.max(20, Number(activeOverride.animationFrameDuration ?? 120)))
    return () => window.clearInterval(interval)
  }, [activeOverride.animationFrameDuration, animationFrames.length, isAnimationPreviewing])

  useEffect(() => {
    const previousCount = previousAnimationFrameCountRef.current
    previousAnimationFrameCountRef.current = animationFrames.length
    if (animationFrames.length === 0) {
      setIsAnimationPreviewing(false)
      setPreviewFrameIndex(0)
      setSelectedAnimationFrameIndex(null)
      return
    }
    setPreviewFrameIndex((current) => Math.min(current, animationFrames.length - 1))
    if (animationFrames.length > previousCount) {
      setSelectedAnimationFrameIndex(animationFrames.length - 1)
      return
    }
    setSelectedAnimationFrameIndex((current) => current == null ? 0 : Math.min(current, animationFrames.length - 1))
  }, [animationFrames.length])

  const applyPreset = (preset: MaskPreset) => {
    if (selectedTileId == null || !activeGroup) return
    if (preset === 'custom') {
      setSelectedPreset('custom')
      const nextMask = emptyMask()
      onUpdateTileOverride(selectedTileId, activeGroup.id, {
        solid: false,
        collisionMask: nextMask,
        hitbox: deriveHitboxFromMask(nextMask),
      })
      return
    }
    setSelectedPreset(preset)
    const nextMask = presetCollisionMask(preset)
    const nextSolid = hasAnyCollision(nextMask)
    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      solid: nextSolid,
      collisionMask: nextMask,
      hitbox: deriveHitboxFromMask(nextMask),
    })
  }

  const applyRectangle = (anchorX: number, anchorY: number, targetX: number, targetY: number, mode: 'fill' | 'erase') => {
    if (selectedTileId == null || !activeGroup) return
    setSelectedPreset('custom')
    const nextMask = cloneMask(mask)
    const minX = Math.min(anchorX, targetX)
    const maxX = Math.max(anchorX, targetX)
    const minY = Math.min(anchorY, targetY)
    const maxY = Math.max(anchorY, targetY)

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        nextMask[y][x] = mode === 'fill'
      }
    }

    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      solid: hasAnyCollision(nextMask),
      collisionMask: nextMask,
      hitbox: deriveHitboxFromMask(nextMask),
    })
  }

  const handleCollisionModeChange = (mode: 'solid' | 'nonSolid' | 'custom') => {
    if (selectedTileId == null || !activeGroup) return

    if (mode === 'solid') {
      onUpdateTileOverride(selectedTileId, activeGroup.id, {
        solid: true,
        collisionMask: undefined,
        hitbox: defaultHitboxForType(effectiveType, true),
      })
      return
    }

    if (mode === 'nonSolid') {
      onUpdateTileOverride(selectedTileId, activeGroup.id, {
        solid: false,
        collisionMask: undefined,
        hitbox: defaultHitboxForType(effectiveType, false),
      })
      return
    }

    setSelectedPreset('custom')
    const nextMask = emptyMask()
    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      solid: false,
      collisionMask: nextMask,
      hitbox: deriveHitboxFromMask(nextMask),
    })
  }

  const writeAnimationFrames = (frames: AnimationFrameRef[]) => {
    if (selectedTileId == null || !activeGroup || !selectedTile) return
    const baseFrame: AnimationFrameRef = { tileId: selectedTile.id, tileIndex: selectedTile.index, x: frames[0]?.x ?? 0, y: frames[0]?.y ?? 0 }
    const normalizedFrames = [
      baseFrame,
      ...frames.filter((frame, index) => index > 0 && frame.tileId !== selectedTile.id),
    ]
    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      animationFrames: normalizedFrames,
      animationFrameTileIds: normalizedFrames.map((frame) => frame.tileId),
      animationFrameDuration: Number(activeOverride.animationFrameDuration ?? 120),
      animationLoop: normalizedFrames.length > 0 ? true : undefined,
    })
  }

  const updateAnimationFrame = (frameIndex: number, updates: Partial<AnimationFrameRef>) => {
    writeAnimationFrames(animationFrames.map((frame, index) => (index === frameIndex ? { ...frame, ...updates } : frame)))
  }

  const removeAnimationFrame = (frameIndex: number) => {
    if (frameIndex === 0) return
    writeAnimationFrames(animationFrames.filter((_, index) => index !== frameIndex))
  }

  const selectedAnimationFrame = selectedAnimationFrameIndex != null ? animationFrames[selectedAnimationFrameIndex] ?? null : null
  const displayedAnimationFrame = isAnimationPreviewing ? animationFrames[previewFrameIndex] ?? null : selectedAnimationFrame
  const displayedAnimationFrameTile = displayedAnimationFrame
    ? allTiles.find((tile) => tile.id === displayedAnimationFrame.tileId || tile.index === displayedAnimationFrame.tileIndex) ?? null
    : null
  const displayedAnimationFrameOverride = displayedAnimationFrameTile
    ? (((activeGroup?.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)[String(displayedAnimationFrameTile.id)] ?? {}) as TileOverride
    : {}

  const addBlockedColor = (color: string) => {
    if (selectedTileId == null || !activeGroup) return
    const normalized = normalizeColorHex(color)
    if (!normalized || blockedColors.includes(normalized)) return
    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      blockedColors: [...blockedColors, normalized],
    })
  }

  const removeBlockedColor = (color: string) => {
    if (selectedTileId == null || !activeGroup) return
    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      blockedColors: blockedColors.filter((candidate) => candidate !== color),
    })
  }

  const toggleDeletedPixel = (x: number, y: number) => {
    if (selectedTileId == null || !activeGroup) return
    const key = `${x},${y}`
    onUpdateTileOverride(selectedTileId, activeGroup.id, {
      deletedPixels: deletedPixels.includes(key)
        ? deletedPixels.filter((candidate) => candidate !== key)
        : [...deletedPixels, key],
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
      <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        Tile properties
      </Typography>
      {!selectedTile || !activeGroup || selectedTileId == null ? (
        <EmptySurface message="Select a tile in the layout preview to edit its properties." />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
          <Tabs
            value={activeEditorTab}
            onChange={(_, value) => setActiveEditorTab(value as 'pixels' | 'collision' | 'animation' | 'states')}
            variant="fullWidth"
            sx={{
              width: '100%',
              minWidth: 0,
              minHeight: 34,
              maxWidth: '100%',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              '& .MuiTabs-scroller': {
                minWidth: 0,
              },
              '& .MuiTabs-flexContainer': {
                minWidth: 0,
              },
              '& .MuiTab-root': {
                minWidth: 0,
                minHeight: 34,
                px: 1,
                fontSize: 12,
                textTransform: 'none',
                color: '#8b949e',
              },
              '& .Mui-selected': {
                color: '#5d9eff',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#5d9eff',
              },
            }}
          >
            <Tab value="pixels" label="Pixels" />
            <Tab value="collision" label="Collision" />
            <Tab value="animation" label="Animation" />
            {isObjectsGroup && <Tab value="states" label="States" />}
          </Tabs>

          {activeEditorTab === 'collision' ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 2, width: '100%', minWidth: 0, overflowX: 'hidden' }}>
              <Box sx={{ width: '100%', minWidth: 0, border: '1px solid rgba(255,255,255,0.08)', p: 1.25, boxSizing: 'border-box', display: 'grid', placeItems: 'center', ...previewPatternSx }}>
                <Box sx={{ position: 'relative', width: '100%', maxWidth: TILE_PREVIEW_EDITOR_SIZE, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                  <TilePreviewImage
                    tile={selectedTile}
                    tileWidth={tileWidth}
                    tileHeight={tileHeight}
                    size="100%"
                    sourceImageUrl={sourceImageUrl}
                    sourceOffsetX={sourceOffsetX}
                    sourceOffsetY={sourceOffsetY}
                    blockedColors={blockedColors}
                    deletedPixels={deletedPixels}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gridTemplateRows: 'repeat(16, 1fr)' }}>
                    {mask.flatMap((row, y) =>
                      row.map((filled, x) => (
                        <Box
                          key={`${x}-${y}`}
                          onMouseDown={(event) => {
                            event.preventDefault()
                            if (collisionMode !== 'custom') return
                            const mode = mask[y][x] ? 'erase' : 'fill'
                            setDragPaint({ anchorX: x, anchorY: y, mode })
                            applyRectangle(x, y, x, y, mode)
                          }}
                          onMouseEnter={() => {
                            if (!dragPaint || collisionMode !== 'custom') return
                            applyRectangle(dragPaint.anchorX, dragPaint.anchorY, x, y, dragPaint.mode)
                          }}
                          sx={{
                            borderRight: x < 15 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            borderBottom: y < 15 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                            bgcolor: filled ? 'rgba(232,75,74,0.42)' : 'transparent',
                            cursor: collisionMode === 'custom' ? 'crosshair' : 'default',
                            '&:hover': {
                              bgcolor: filled ? 'rgba(232,75,74,0.56)' : 'rgba(255,255,255,0.08)',
                            },
                          }}
                        />
                      )),
                    )}
                  </Box>
                </Box>
              </Box>
              <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${1 + (isObjectsGroup ? 0 : 1) + (effectiveType === 'object' ? 1 : 0)}, minmax(0, 1fr))`,
                    gap: 1,
                    alignItems: 'end',
                    minWidth: 0,
                  }}
                >
                  <FormControl variant="standard" size="small" fullWidth>
                    <InputLabel>Collision</InputLabel>
                    <Select value={collisionMode} label="Collision" onChange={(event) => handleCollisionModeChange(event.target.value as 'solid' | 'nonSolid' | 'custom')} sx={inspectorSelectSx}>
                      <MenuItem value="solid">Solid</MenuItem>
                      <MenuItem value="nonSolid">Non-solid</MenuItem>
                      <MenuItem value="custom">Custom</MenuItem>
                    </Select>
                  </FormControl>
                  {!isObjectsGroup ? <FormControl variant="standard" size="small" fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select value={effectiveType} label="Type" onChange={(event) => onUpdateTileOverride(selectedTileId, activeGroup.id, { tileType: event.target.value as TileType })} sx={inspectorSelectSx}>
                      {TERRAIN_TILE_TYPE_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>{capitalize(option)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl> : null}
                  {effectiveType === 'object' ? (
                    <FormControl variant="standard" size="small" fullWidth>
                      <InputLabel>Kind</InputLabel>
                      <Select
                        value={objectKind}
                        label="Kind"
                        onChange={(event) => {
                          const nextKind = event.target.value as 'object' | 'door'
                          onUpdateTileOverride(selectedTileId, activeGroup.id, {
                            objectKind: nextKind,
                            objectCategory: nextKind === 'door' ? 'interactive' : activeOverride.objectCategory,
                            solid: nextKind === 'door' ? true : activeOverride.solid,
                          })
                        }}
                        sx={inspectorSelectSx}
                      >
                        <MenuItem value="object">Object</MenuItem>
                        <MenuItem value="door">Door</MenuItem>
                      </Select>
                    </FormControl>
                  ) : null}
                </Box>
                {collisionMode === 'custom' ? (
                  <FormControl variant="standard" size="small" fullWidth>
                    <InputLabel>Preset</InputLabel>
                    <Select
                      value={selectedPreset}
                      label="Preset"
                      onChange={(event) => applyPreset(event.target.value as MaskPreset)}
                      sx={inspectorSelectSx}
                      MenuProps={{
                        slotProps: {
                          paper: {
                            sx: { maxHeight: 296, overflowY: 'auto', '& .MuiMenu-list': { py: 0.5 } },
                          },
                        },
                      }}
                      renderValue={(value) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MaskPresetSwatch preset={value as MaskPreset} />
                          <Typography sx={{ fontSize: 14, color: 'rgba(240,245,255,0.9)' }}>{presetLabel(value as MaskPreset)}</Typography>
                        </Box>
                      )}
                    >
                      {MASK_PRESETS.map((preset) => (
                        <MenuItem key={preset} value={preset}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MaskPresetSwatch preset={preset} />
                            <Typography sx={{ fontSize: 14 }}>{presetLabel(preset)}</Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : null}
                {objectKind === 'door' && effectiveType === 'object' ? (
                  <Typography sx={{ fontSize: 12, color: '#8b949e', lineHeight: 1.45 }}>
                    Door instances start closed, solid, and use a key trigger by default. Set open sprite and required item after placing.
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ) : null}

          {activeEditorTab === 'animation' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflowX: 'hidden' }}>
              <Box sx={{ width: '100%', minWidth: 0, border: '1px solid rgba(255,255,255,0.08)', p: 1.25, boxSizing: 'border-box', display: 'grid', placeItems: 'center', ...previewPatternSx }}>
                <Box sx={{ width: '100%', maxWidth: TILE_PREVIEW_EDITOR_SIZE, aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                  {displayedAnimationFrameTile && displayedAnimationFrame ? (
                    <TilePreviewImage
                      tile={displayedAnimationFrameTile}
                      tileWidth={tileWidth}
                      tileHeight={tileHeight}
                      size="100%"
                      sourceImageUrl={sourceImageUrl}
                      sourceOffsetX={(displayedAnimationFrameOverride.sourceOffsetX ?? 0) + Number(displayedAnimationFrame.x ?? 0)}
                      sourceOffsetY={(displayedAnimationFrameOverride.sourceOffsetY ?? 0) + Number(displayedAnimationFrame.y ?? 0)}
                      blockedColors={displayedAnimationFrameOverride.blockedColors ?? []}
                      deletedPixels={displayedAnimationFrameOverride.deletedPixels ?? []}
                    />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No frame selected</Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '30px minmax(0, 1fr) 30px', gap: 0.75, alignItems: 'center', minWidth: 0 }}>
                <Tooltip title={isPickingAnimationFrame ? 'Click a tile on canvas' : 'Add frame'}>
                  <IconButton
                    onClick={onStartAnimationFramePick}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '8px',
                      border: isPickingAnimationFrame ? '1px solid rgba(55,138,221,0.55)' : '1px solid rgba(255,255,255,0.07)',
                      bgcolor: isPickingAnimationFrame ? 'rgba(55,138,221,0.12)' : 'transparent',
                      color: isPickingAnimationFrame ? '#378ADD' : '#8b949e',
                      '&:hover': { bgcolor: isPickingAnimationFrame ? 'rgba(55,138,221,0.18)' : 'rgba(255,255,255,0.08)' },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
                {animationFrames.length === 0 ? (
                  <Box sx={{ border: '1px dashed rgba(255,255,255,0.10)', borderRadius: 1, px: 1, py: 0.8, bgcolor: 'rgba(255,255,255,0.018)', minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Click + then select tiles from the canvas</Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: '6px', minWidth: 0, overflowX: 'auto', py: 0.5, px: 0.25 }}>
                    {animationFrames.map((frame, frameIndex) => {
                      const frameTile = allTiles.find((tile) => tile.id === frame.tileId || tile.index === frame.tileIndex)
                      const frameOverride = frameTile
                        ? (((activeGroup.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)[String(frameTile.id)] ?? {}) as TileOverride
                        : {}
                      const isPreviewFrame = isAnimationPreviewing && frameIndex === previewFrameIndex
                      const isSelectedFrame = selectedAnimationFrameIndex === frameIndex
                      const isBaseFrame = frameIndex === 0
                      return (
                        <Box
                          key={`${frame.tileId}-${frameIndex}`}
                          onClick={() => setSelectedAnimationFrameIndex(frameIndex)}
                          sx={{
                            position: 'relative',
                            flex: '0 0 auto',
                            width: 44,
                            height: 44,
                            display: 'grid',
                            placeItems: 'center',
                            p: 0.55,
                            border: isPreviewFrame
                              ? '1px solid rgba(246,196,83,0.82)'
                              : isSelectedFrame
                                ? '1px solid rgba(55,138,221,0.72)'
                                : '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 1,
                            bgcolor: isPreviewFrame
                              ? 'rgba(246,196,83,0.13)'
                              : isSelectedFrame
                                ? 'rgba(55,138,221,0.10)'
                                : 'rgba(255,255,255,0.03)',
                            boxShadow: isPreviewFrame ? '0 0 0 2px rgba(246,196,83,0.10)' : 'none',
                            cursor: 'pointer',
                            '&:hover .frame-delete': { opacity: isBaseFrame ? 0 : 1 },
                          }}
                        >
                          {!isBaseFrame ? (
                            <IconButton
                              className="frame-delete"
                              onClick={(event) => {
                                event.stopPropagation()
                                setIsAnimationPreviewing(false)
                                removeAnimationFrame(frameIndex)
                              }}
                              sx={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                width: 18,
                                height: 18,
                                opacity: 0,
                                borderRadius: '999px',
                                bgcolor: 'rgba(226,75,74,0.18)',
                                color: '#E24B4A',
                                transition: 'opacity 120ms ease',
                                '&:hover': { bgcolor: 'rgba(226,75,74,0.28)' },
                              }}
                            >
                              <CloseIcon sx={{ fontSize: 11 }} />
                            </IconButton>
                          ) : null}
                          {frameTile ? (
                            <TilePreviewImage
                              tile={frameTile}
                              tileWidth={tileWidth}
                              tileHeight={tileHeight}
                              size={32}
                              sourceImageUrl={sourceImageUrl}
                              sourceOffsetX={(frameOverride.sourceOffsetX ?? 0) + Number(frame.x ?? 0)}
                              sourceOffsetY={(frameOverride.sourceOffsetY ?? 0) + Number(frame.y ?? 0)}
                              blockedColors={frameOverride.blockedColors ?? []}
                              deletedPixels={frameOverride.deletedPixels ?? []}
                              sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', bgcolor: '#0d0d0d' }}
                            />
                          ) : (
                            <Box sx={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,0.10)', borderRadius: '4px', bgcolor: 'rgba(255,255,255,0.035)' }} />
                          )}
                        </Box>
                      )
                    })}
                  </Box>
                )}
                <Tooltip title={isAnimationPreviewing ? 'Stop preview' : 'Preview animation'}>
                  <span>
                    <IconButton
                      disabled={animationFrames.length === 0}
                      onClick={() => {
                        if (animationFrames.length === 0) return
                        setIsAnimationPreviewing((current) => {
                          if (!current) setPreviewFrameIndex(0)
                          return !current
                        })
                      }}
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: '8px',
                        border: isAnimationPreviewing ? '1px solid rgba(226,75,74,0.55)' : '1px solid rgba(55,138,221,0.45)',
                        bgcolor: animationFrames.length === 0 ? 'transparent' : isAnimationPreviewing ? 'rgba(226,75,74,0.12)' : 'rgba(55,138,221,0.10)',
                        color: animationFrames.length === 0 ? 'rgba(255,255,255,0.22)' : isAnimationPreviewing ? '#E24B4A' : '#378ADD',
                        '&:hover': {
                          bgcolor: animationFrames.length === 0 ? 'transparent' : isAnimationPreviewing ? 'rgba(226,75,74,0.20)' : 'rgba(55,138,221,0.16)',
                        },
                      }}
                    >
                      {isAnimationPreviewing ? <StopIcon sx={{ fontSize: 17 }} /> : <PlayArrowIcon sx={{ fontSize: 17 }} />}
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '58px 58px minmax(0, 1fr)', gap: 0.75, alignItems: 'end', minWidth: 0 }}>
                {selectedAnimationFrame && selectedAnimationFrameIndex != null ? (
                  <>
                  <TextField
                    label="X"
                    variant="standard"
                    size="small"
                    type="number"
                    value={Number(selectedAnimationFrame.x ?? 0)}
                    onChange={(event) => updateAnimationFrame(selectedAnimationFrameIndex, { x: Number(event.target.value) || 0 })}
                    sx={inspectorFieldSx}
                  />
                  <TextField
                    label="Y"
                    variant="standard"
                    size="small"
                    type="number"
                    value={Number(selectedAnimationFrame.y ?? 0)}
                    onChange={(event) => updateAnimationFrame(selectedAnimationFrameIndex, { y: Number(event.target.value) || 0 })}
                    sx={inspectorFieldSx}
                  />
                  </>
                ) : (
                  <>
                    <Box />
                    <Box />
                  </>
                )}
                <TextField
                  label="Frame duration (ms)"
                  variant="standard"
                  size="small"
                  type="number"
                  value={Number(activeOverride.animationFrameDuration ?? 120)}
                  onChange={(event) => onUpdateTileOverride(selectedTileId, activeGroup.id, { animationFrameDuration: Math.max(20, Number(event.target.value) || 120), animationLoop: true })}
                  sx={inspectorFieldSx}
                />
              </Box>
            </Box>
          ) : null}

          {activeEditorTab === 'states' && isObjectsGroup ? (
            <StatesTabContent
              activeGroup={activeGroup}
              selectedTile={selectedTile}
              defaultCollision={effectiveSolid ? 'solid' : 'passable'}
              objectKind={objectKind}
              allTiles={allTiles}
              tileWidth={tileWidth}
              tileHeight={tileHeight}
              sourceImageUrl={sourceImageUrl}
              onUpdateGroupMeta={onUpdateGroupMeta}
              stateSpritePickerIdx={stateSpritePickerIdx}
              onStartStateSpritePick={onStartStateSpritePick}
            />
          ) : null}

          {activeEditorTab === 'pixels' ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75, minWidth: 0, overflowX: 'hidden' }}>
              <PixelEditorCanvas
                tile={selectedTile}
                tileWidth={tileWidth}
                tileHeight={tileHeight}
                sourceImageUrl={sourceImageUrl}
                sourceOffsetX={sourceOffsetX}
                sourceOffsetY={sourceOffsetY}
                blockedColors={blockedColors}
                deletedPixels={deletedPixels}
                mode={pixelEditMode}
                onTogglePixel={toggleDeletedPixel}
                onPickColor={addBlockedColor}
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: '58px 58px minmax(0, 1fr)', gap: 1, alignItems: 'end', minWidth: 0 }}>
                <TextField label="X" variant="standard" size="small" type="number" value={sourceOffsetX} onChange={(event) => onUpdateTileOverride(selectedTileId, activeGroup.id, { sourceOffsetX: Number(event.target.value) || 0 })} sx={inspectorFieldSx} />
                <TextField label="Y" variant="standard" size="small" type="number" value={sourceOffsetY} onChange={(event) => onUpdateTileOverride(selectedTileId, activeGroup.id, { sourceOffsetY: Number(event.target.value) || 0 })} sx={inspectorFieldSx} />
                <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'flex-end', minWidth: 0, flexWrap: 'wrap' }}>
                  <Tooltip title="Delete pixel">
                    <IconButton onClick={() => setPixelEditMode('delete')} sx={pixelModeButtonSx(pixelEditMode === 'delete')}>
                      <DeleteIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Block color">
                    <IconButton onClick={() => setPixelEditMode('color')} sx={pixelModeButtonSx(pixelEditMode === 'color')}>
                      <ColorizeIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                {blockedColors.length > 0 ? (
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', minWidth: 0 }}>
                    {blockedColors.map((color) => (
                      <Button key={color} onClick={() => removeBlockedColor(color)} sx={{ ...miniActionSx, gap: 0.75, maxWidth: '100%', overflow: 'hidden' }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: color, border: '1px solid rgba(255,255,255,0.18)' }} />
                        {color}
                      </Button>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>No blocked colors.</Typography>
                )}
              </Box>
            </Box>
          ) : null}
        </Box>
      )}
    </Box>
  )
}

function StatesTabContent({
  activeGroup,
  selectedTile,
  defaultCollision,
  objectKind,
  allTiles,
  tileWidth,
  tileHeight,
  sourceImageUrl,
  onUpdateGroupMeta,
  stateSpritePickerIdx,
  onStartStateSpritePick,
}: {
  activeGroup: GroupDraft
  selectedTile: ExtractedTile | null
  defaultCollision: 'solid' | 'passable'
  objectKind: 'object' | 'door'
  allTiles: ExtractedTile[]
  tileWidth: number
  tileHeight: number
  sourceImageUrl?: string
  onUpdateGroupMeta: (groupId: string, key: string, value: unknown) => void
  stateSpritePickerIdx: number | null
  onStartStateSpritePick: (stateIdx: number) => void
}) {
  const isStateful = Boolean(activeGroup.metadata.isStateful)
  const stateDefs = (activeGroup.metadata.stateDefs ?? []) as ObjectStateDraftDef[]
  const stateTransitions = (activeGroup.metadata.stateTransitions ?? []) as ObjectStateTransitionDraft[]
  const defaultStateName = objectKind === 'door' ? 'Closed' : 'Default'

  const createDefaultState = (): ObjectStateDraftDef | null => {
    if (!selectedTile) return null
    return {
      id: `state-${Date.now().toString(36)}`,
      name: defaultStateName,
      sprite: { tileIndex: selectedTile.index, x: 0, y: 0 },
      collision: defaultCollision,
    }
  }

  useEffect(() => {
    if (!isStateful || stateDefs.length > 0) return
    const initialState = createDefaultState()
    if (!initialState) return
    onUpdateGroupMeta(activeGroup.id, 'stateDefs', [initialState])
  }, [activeGroup.id, defaultCollision, defaultStateName, isStateful, onUpdateGroupMeta, selectedTile, stateDefs.length])

  const addState = () => {
    const newState: ObjectStateDraftDef = {
      id: `state-${Date.now().toString(36)}`,
      name: `State ${stateDefs.length + 1}`,
      sprite: { tileIndex: EMPTY_STATE_TILE_INDEX, x: 0, y: 0 },
      collision: 'solid',
    }
    onUpdateGroupMeta(activeGroup.id, 'stateDefs', [...stateDefs, newState])
  }

  const updateState = (index: number, updates: Partial<ObjectStateDraftDef>) => {
    onUpdateGroupMeta(activeGroup.id, 'stateDefs', stateDefs.map((s, i) => i === index ? { ...s, ...updates } : s))
  }

  const updateStateSprite = (index: number, updates: Partial<ObjectStateDraftDef['sprite']>) => {
    onUpdateGroupMeta(activeGroup.id, 'stateDefs', stateDefs.map((s, i) => i === index ? { ...s, sprite: { ...s.sprite, ...updates } } : s))
  }

  const removeState = (index: number) => {
    if (stateDefs.length <= 1) return
    const removedId = stateDefs[index].id
    onUpdateGroupMeta(activeGroup.id, 'stateDefs', stateDefs.filter((_, i) => i !== index))
    onUpdateGroupMeta(activeGroup.id, 'stateTransitions', stateTransitions.filter(t => t.fromStateId !== removedId && t.toStateId !== removedId))
  }

  const addTransition = () => {
    if (stateDefs.length < 2) return
    const newTransition: ObjectStateTransitionDraft = {
      id: `tr-${Date.now().toString(36)}`,
      fromStateId: stateDefs[0].id,
      toStateId: stateDefs[1].id,
      condition: 'on_interact',
    }
    onUpdateGroupMeta(activeGroup.id, 'stateTransitions', [...stateTransitions, newTransition])
  }

  const updateTransition = (index: number, updates: Partial<ObjectStateTransitionDraft>) => {
    onUpdateGroupMeta(activeGroup.id, 'stateTransitions', stateTransitions.map((t, i) => i === index ? { ...t, ...updates } : t))
  }

  const removeTransition = (index: number) => {
    onUpdateGroupMeta(activeGroup.id, 'stateTransitions', stateTransitions.filter((_, i) => i !== index))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
      <FormControlLabel
        control={
          <Checkbox
            size="small"
            checked={isStateful}
            onChange={(e) => {
              const enabled = e.target.checked
              onUpdateGroupMeta(activeGroup.id, 'isStateful', enabled)
              if (!enabled || stateDefs.length > 0) return
              const initialState = createDefaultState()
              if (initialState) onUpdateGroupMeta(activeGroup.id, 'stateDefs', [initialState])
            }}
            sx={{ p: 0.5, color: 'rgba(220,230,245,0.36)', '&.Mui-checked': { color: '#5d9eff' } }}
          />
        }
        label={<Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.72)' }}>Stateful object</Typography>}
        sx={{ mx: 0, gap: 0.25 }}
      />

      {isStateful && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(220,230,245,0.48)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>States</Typography>
              <Button size="small" startIcon={<AddIcon sx={{ fontSize: '12px !important' }} />} onClick={addState} sx={{ fontSize: 11, py: 0.25, px: 0.75, minWidth: 0, color: '#5d9eff', lineHeight: 1.4 }}>
                Add
              </Button>
            </Box>
            {stateDefs.length === 0 && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>No states defined.</Typography>
            )}
            {stateDefs.map((state, idx) => {
              const spriteTile = state.sprite.tileIndex >= 0 ? allTiles.find((t) => t.index === state.sprite.tileIndex) ?? null : null
              const isPicking = stateSpritePickerIdx === idx
              const isDefault = idx === 0
              return (
                <Box key={state.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, py: 0.85, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 650, color: isDefault ? '#5d9eff' : 'rgba(220,230,245,0.42)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {isDefault ? 'Default state' : `State ${idx + 1}`}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.9, alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
                    <StateTileSlot
                      tile={spriteTile}
                      tileWidth={tileWidth}
                      tileHeight={tileHeight}
                      sourceImageUrl={sourceImageUrl}
                      offsetX={Number(state.sprite.x ?? 0)}
                      offsetY={Number(state.sprite.y ?? 0)}
                      isPicking={isPicking}
                      onClick={() => onStartStateSpritePick(idx)}
                    />
                    <TextField
                      placeholder="State name"
                      variant="standard"
                      size="small"
                      value={state.name}
                      onChange={(e) => updateState(idx, { name: e.target.value })}
                      sx={{ ...stateInlineFieldSx, flex: '1 1 124px', minWidth: 124 }}
                    />
                    <FormControl variant="standard" size="small" sx={{ flex: '1 0 140px', minWidth: 140 }}>
                      <InputLabel>Collision</InputLabel>
                      <Select
                        value={state.collision}
                        onChange={(e) => updateState(idx, { collision: e.target.value as 'solid' | 'passable' })}
                        sx={stateCollisionSelectSx}
                      >
                        <MenuItem value="solid">Solid</MenuItem>
                        <MenuItem value="passable">Passable</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="X"
                      variant="standard"
                      size="small"
                      type="number"
                      value={Number(state.sprite.x ?? 0)}
                      onChange={(e) => updateStateSprite(idx, { x: Number(e.target.value) || 0 })}
                      sx={stateOffsetFieldSx}
                    />
                    <TextField
                      label="Y"
                      variant="standard"
                      size="small"
                      type="number"
                      value={Number(state.sprite.y ?? 0)}
                      onChange={(e) => updateStateSprite(idx, { y: Number(e.target.value) || 0 })}
                      sx={stateOffsetFieldSx}
                    />
                    {isDefault ? (
                      <Tooltip title="Default state is locked">
                        <Box sx={{ width: 32, height: 32, display: 'grid', placeItems: 'center', color: 'rgba(93,158,255,0.72)', flex: '0 0 32px' }}>
                          <LockOutlinedIcon sx={{ fontSize: 15 }} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Delete state">
                        <IconButton size="small" onClick={() => removeState(idx)} sx={{ p: 0, color: '#ff7b72', width: 32, height: 32, alignSelf: 'center', flex: '0 0 32px' }}>
                          <CloseIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'rgba(220,230,245,0.48)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Transitions</Typography>
              <Button size="small" startIcon={<AddIcon sx={{ fontSize: '12px !important' }} />} onClick={addTransition} disabled={stateDefs.length < 2} sx={{ fontSize: 11, py: 0.25, px: 0.75, minWidth: 0, color: '#5d9eff', lineHeight: 1.4 }}>
                Add
              </Button>
            </Box>
            {stateTransitions.length === 0 && (
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>No transitions defined.</Typography>
            )}
            {stateTransitions.map((tr, idx) => (
              <Box key={tr.id} sx={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 0.8, py: 0.85, pr: 4, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <IconButton size="small" onClick={() => removeTransition(idx)} sx={{ position: 'absolute', top: 8, right: 0, p: 0, color: '#ff7b72', width: 28, height: 28 }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 1, alignItems: 'end' }}>
                  <FormControl variant="standard" size="small" fullWidth>
                    <InputLabel>From</InputLabel>
                    <Select value={tr.fromStateId} onChange={(e) => updateTransition(idx, { fromStateId: e.target.value })} sx={inspectorSelectSx}>
                      {stateDefs.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <FormControl variant="standard" size="small" fullWidth>
                    <InputLabel>To</InputLabel>
                    <Select value={tr.toStateId} onChange={(e) => updateTransition(idx, { toStateId: e.target.value })} sx={inspectorSelectSx}>
                      {stateDefs.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Box>
                <FormControl variant="standard" size="small" fullWidth>
                  <InputLabel>Condition</InputLabel>
                  <Select value={tr.condition} onChange={(e) => updateTransition(idx, { condition: e.target.value as ObjectStateTransitionDraft['condition'] })} sx={inspectorSelectSx}>
                    <MenuItem value="on_interact">On Interact</MenuItem>
                    <MenuItem value="on_touched">On Touched</MenuItem>
                    <MenuItem value="on_pushed">On Pushed</MenuItem>
                    <MenuItem value="on_trigger">On Trigger</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}

function StateTileSlot({
  tile,
  tileWidth,
  tileHeight,
  sourceImageUrl,
  offsetX,
  offsetY,
  isPicking,
  onClick,
}: {
  tile: ExtractedTile | null
  tileWidth: number
  tileHeight: number
  sourceImageUrl?: string
  offsetX: number
  offsetY: number
  isPicking: boolean
  onClick: () => void
}) {
  return (
    <Tooltip title={isPicking ? 'Click a tile on the canvas' : tile ? 'Replace tile' : 'Assign tile'}>
      <Box
        onClick={onClick}
        sx={{
          flex: '0 0 48px',
          width: 48,
          height: 48,
          display: 'grid',
          placeItems: 'center',
          p: 0.55,
          border: isPicking ? '1px solid rgba(55,138,221,0.72)' : tile ? '1px solid rgba(255,255,255,0.08)' : '1px dashed rgba(255,255,255,0.18)',
          borderRadius: 1,
          bgcolor: isPicking ? 'rgba(55,138,221,0.10)' : tile ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.018)',
          boxShadow: isPicking ? '0 0 0 2px rgba(55,138,221,0.08)' : 'none',
          cursor: 'pointer',
          '&:hover': {
            borderColor: isPicking ? 'rgba(55,138,221,0.86)' : 'rgba(93,158,255,0.50)',
            bgcolor: isPicking ? 'rgba(55,138,221,0.14)' : 'rgba(255,255,255,0.055)',
          },
        }}
      >
        {tile ? (
          <TilePreviewImage
            tile={tile}
            tileWidth={tileWidth}
            tileHeight={tileHeight}
            size={34}
            sourceImageUrl={sourceImageUrl}
            sourceOffsetX={offsetX}
            sourceOffsetY={offsetY}
            sx={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', bgcolor: '#0d0d0d' }}
          />
        ) : (
          <AddIcon sx={{ fontSize: 18, color: isPicking ? '#378ADD' : 'rgba(220,230,245,0.46)' }} />
        )}
      </Box>
    </Tooltip>
  )
}

function GroupPropertiesPanel({
  activeGroup,
  onUpdateGroupDimension,
  onUpdateGroupTileType,
  onDeleteGroup,
}: {
  activeGroup: GroupDraft | null
  onUpdateGroupDimension: (groupId: string, key: 'width' | 'height', value: number) => void
  onUpdateGroupTileType: (groupId: string, tileType: TileType) => void
  onDeleteGroup: (groupId: string) => void
}) {
  if (!activeGroup) {
    return null
  }

  const isObjectsGroup = String(activeGroup.metadata.tileType) === 'object' || String(activeGroup.metadata.systemRole) === 'objects' || activeGroup.name === 'Objects'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, width: '100%', minWidth: 0, maxWidth: '100%', overflowX: 'hidden' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: isObjectsGroup ? '52px 52px 28px' : 'minmax(0, 1fr) 52px 52px 28px', alignItems: 'end', gap: 1, width: '100%', minWidth: 0 }}>
        {!isObjectsGroup ? (
          <FormControl variant="standard" size="small" fullWidth sx={{ minWidth: 0 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={String(activeGroup.metadata.tileType ?? 'floor')}
              label="Type"
              onChange={(event) => onUpdateGroupTileType(activeGroup.id, event.target.value as TileType)}
              sx={inspectorSelectSx}
            >
              <MenuItem value="floor">Floor</MenuItem>
              <MenuItem value="wall">Wall</MenuItem>
              <MenuItem value="water">Water</MenuItem>
            </Select>
          </FormControl>
        ) : null}
        <TextField
          label="W"
          variant="standard"
          size="small"
          type="number"
          value={Number(activeGroup.metadata.width ?? 1)}
          onChange={(event) => onUpdateGroupDimension(activeGroup.id, 'width', Math.max(1, Number(event.target.value || 1)))}
          sx={inspectorFieldSx}
        />
        <TextField
          label="H"
          variant="standard"
          size="small"
          type="number"
          value={Number(activeGroup.metadata.height ?? 1)}
          onChange={(event) => onUpdateGroupDimension(activeGroup.id, 'height', Math.max(1, Number(event.target.value || 1)))}
          sx={inspectorFieldSx}
        />
        {!isObjectsGroup ? <Tooltip title="Delete group">
          <IconButton
            onClick={() => onDeleteGroup(activeGroup.id)}
            sx={{
              p: 0,
              width: 24,
              height: 24,
              borderRadius: '999px',
              color: '#ff7b72',
              border: '1px solid rgba(232,75,74,0.28)',
              background: 'rgba(232,75,74,0.08)',
              '&:hover': {
                color: '#ffb4ae',
                background: 'rgba(232,75,74,0.14)',
                borderColor: 'rgba(232,75,74,0.38)',
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip> : <Box />}
      </Box>

    </Box>
  )
}

function TileGrid({
  tiles,
  selectedTileIds,
  tileWidth,
  tileHeight,
  isPickingAnimationFrame,
  onToggleTile,
  onPickAnimationFrameTile,
}: {
  tiles: ExtractedTile[]
  selectedTileIds: number[]
  tileWidth: number
  tileHeight: number
  isPickingAnimationFrame: boolean
  onToggleTile: (tileId: number) => void
  onPickAnimationFrameTile: (tileId: number) => void
}) {
  const tileRefs = useRef(new Map<number, HTMLDivElement>())

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${TILE_GRID_COLUMNS}, ${TILE_GRID_CELL}px)`,
        gap: `${TILE_GRID_GAP}px`,
        width: `${TILE_GRID_WIDTH}px`,
        maxWidth: '100%',
        maxHeight: 220,
        overflowY: 'auto',
      }}
    >
      {tiles.map((tile) => {
        const selected = selectedTileIds.includes(tile.id)
        return (
          <Box
            key={tile.id}
            ref={(element: HTMLDivElement | null) => {
              if (element) tileRefs.current.set(tile.id, element)
              else tileRefs.current.delete(tile.id)
            }}
            onClick={(event) => {
              event.preventDefault()
              if (isPickingAnimationFrame) {
                onPickAnimationFrameTile(tile.id)
                return
              }
              onToggleTile(tile.id)
            }}
            sx={{
              width: 48,
              height: 48,
              borderRadius: '4px',
              border: isPickingAnimationFrame ? '1px solid rgba(55,138,221,0.44)' : selected ? '1px solid rgba(93,158,255,0.4)' : '1px solid rgba(255,255,255,0.06)',
              background: isPickingAnimationFrame ? 'rgba(55,138,221,0.10)' : selected ? 'rgba(93,158,255,0.12)' : 'rgba(255,255,255,0.025)',
              display: 'grid',
              placeItems: 'center',
              cursor: isPickingAnimationFrame ? 'copy' : 'pointer',
            }}
          >
            <TilePreviewImage tile={tile} tileWidth={tileWidth} tileHeight={tileHeight} size={36} />
          </Box>
        )
      })}
    </Box>
  )
}

function TilePreviewImage({
  tile,
  tileWidth,
  tileHeight,
  size,
  sourceImageUrl,
  sourceOffsetX = 0,
  sourceOffsetY = 0,
  blockedColors = [],
  deletedPixels = [],
  draggable = false,
  onDragStart,
  sx,
}: {
  tile: ExtractedTile
  tileWidth: number
  tileHeight: number
  size: number | string
  sourceImageUrl?: string
  sourceOffsetX?: number
  sourceOffsetY?: number
  blockedColors?: string[]
  deletedPixels?: string[]
  draggable?: boolean
  onDragStart?: () => void
  sx?: SxProps<Theme>
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isComposedTile = String(tile.hash).startsWith('existing-')
  const occurrence = tile.sourceOccurrences[0]
  const occurrenceX = (occurrence?.x ?? 0) + sourceOffsetX
  const occurrenceY = (occurrence?.y ?? 0) + sourceOffsetY
  const canRenderSourceCrop = Boolean(sourceImageUrl && occurrence && !isComposedTile)
  const canRenderComposedCrop = Boolean(isComposedTile && occurrence)

  useEffect(() => {
    if (!canRenderSourceCrop && !canRenderComposedCrop) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      drawFilteredTile(ctx, image, occurrenceX, occurrenceY, tileWidth, tileHeight, blockedColors, deletedPixels)
    }
    image.src = canRenderSourceCrop ? sourceImageUrl! : tile.imageUrl
  }, [blockedColors, canRenderComposedCrop, canRenderSourceCrop, deletedPixels, occurrenceX, occurrenceY, sourceImageUrl, tile.imageUrl, tileHeight, tileWidth])

  const baseSx: SxProps<Theme> = {
    width: size,
    height: size,
    display: 'block',
    imageRendering: 'pixelated',
  }
  const previewSx: SxProps<Theme> = sx
    ? ([baseSx, ...(Array.isArray(sx) ? sx : [sx])] as SxProps<Theme>)
    : baseSx

  if (!canRenderSourceCrop && !canRenderComposedCrop) {
    return (
      <Box
        component="img"
        src={tile.imageUrl}
        alt={`tile-${tile.index}`}
        draggable={draggable}
        onDragStart={onDragStart}
        sx={previewSx}
      />
    )
  }

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      width={tileWidth}
      height={tileHeight}
      draggable={draggable}
      onDragStart={onDragStart}
      sx={previewSx}
    />
  )
}

function LayoutGrid({
  tileRefs,
  tiles,
  width,
  height,
  draggedItem,
  selectedTileId,
  tileOverrides,
  sourceImageUrl,
  tileWidth,
  tileHeight,
  highlightedTileId,
  fadingTileId,
  compact = false,
  onDragStart,
  onDropItem,
  onRemove,
  onSelectTile,
  onOpenContextMenu,
}: {
  tileRefs: TileRef[]
  tiles: ExtractedTile[]
  width: number
  height: number
  draggedItem: { tileId: number | null; x: number; y: number } | null
  selectedTileId: number | null
  tileOverrides: Record<string, TileOverride>
  sourceImageUrl?: string
  tileWidth: number
  tileHeight: number
  highlightedTileId: number | null
  fadingTileId: number | null
  compact?: boolean
  onDragStart: (item: { tileId: number | null; x: number; y: number } | null) => void
  onDropItem: (source: { tileId: number | null; x: number; y: number }, target: { tileId: number | null; x: number; y: number }) => void
  onRemove: (tileId: number) => void
  onSelectTile: (tileId: number | null) => void
  onOpenContextMenu: (tileId: number, event: MouseEvent<HTMLElement>, mobile?: boolean) => void
}) {
  const byId = new Map(tiles.map((tile) => [tile.id, tile]))
  const longPressTimerRef = useRef<number | null>(null)
  const cells = Array.from({ length: Math.max(1, width * height) }, (_, index) => {
    const x = index % Math.max(1, width)
    const y = Math.floor(index / Math.max(1, width))
    return { x, y, ref: tileRefs.find((ref) => ref.x === x && ref.y === y) ?? null }
  })

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, width)}, ${LAYOUT_CELL}px)`, gridAutoRows: `${LAYOUT_CELL}px`, gap: `${LAYOUT_GAP}px`, width: 'max-content', minWidth: compact ? 0 : '100%', justifyContent: 'start' }}>
      {cells.map((cell, index) => {
        const tile = cell.ref ? byId.get(cell.ref.tileId) : null
        const isSelected = tile != null && tile.id === selectedTileId
        const isHighlighted = tile != null && tile.id === highlightedTileId
        const isFading = tile != null && tile.id === fadingTileId
        const tileOverride = tile != null ? tileOverrides[String(tile.id)] : undefined
        const hasOverride = tileOverride != null
        return (
          <Box
            key={index}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggedItem) onDropItem(draggedItem, { tileId: cell.ref?.tileId ?? null, x: cell.x, y: cell.y })
              onDragStart(null)
            }}
            onClick={(event) => {
              event.stopPropagation()
              onSelectTile(tile?.id ?? null)
            }}
            onContextMenu={(event) => {
              if (!tile) return
              event.preventDefault()
              onOpenContextMenu(tile.id, event)
            }}
            onTouchStart={(event) => {
              if (!tile) return
              const target = event.currentTarget
              longPressTimerRef.current = window.setTimeout(() => {
                onOpenContextMenu(tile.id, event as unknown as MouseEvent<HTMLElement>, true)
                target.blur()
              }, 500)
            }}
            onTouchEnd={() => {
              if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }}
            onTouchMove={() => {
              if (longPressTimerRef.current != null) window.clearTimeout(longPressTimerRef.current)
              longPressTimerRef.current = null
            }}
            sx={{
              width: 56,
              height: 56,
              borderRadius: '4px',
              border: isHighlighted ? '1px solid rgba(77,156,255,0.85)' : isSelected ? '1px solid rgba(93,158,255,0.5)' : '1px dashed rgba(255,255,255,0.07)',
              background: isHighlighted ? 'rgba(77,156,255,0.16)' : isSelected ? 'rgba(93,158,255,0.10)' : tile ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.01)',
              position: 'relative',
              display: 'grid',
              placeItems: 'center',
              cursor: tile ? 'pointer' : 'default',
              opacity: isFading ? 0 : 1,
              transition: 'opacity 200ms ease, border-color 120ms ease, background 120ms ease',
            }}
          >
            {tile ? (
              <>
                <Tooltip title="Remove from group">
                  <IconButton
                    size="small"
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemove(tile.id)
                    }}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 22,
                      height: 22,
                      background: 'rgba(18,24,32,0.92)',
                      color: '#8b949e',
                      '&:hover': { color: '#ff7b72', background: 'rgba(18,24,32,0.98)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Tooltip>
                <TilePreviewImage
                  tile={tile}
                  tileWidth={tileWidth}
                  tileHeight={tileHeight}
                  size={40}
                  sourceImageUrl={sourceImageUrl}
                  sourceOffsetX={tileOverride?.sourceOffsetX ?? 0}
                  sourceOffsetY={tileOverride?.sourceOffsetY ?? 0}
                  blockedColors={tileOverride?.blockedColors ?? []}
                  deletedPixels={tileOverride?.deletedPixels ?? []}
                  draggable
                  onDragStart={() => onDragStart({ tileId: tile.id, x: cell.x, y: cell.y })}
                  sx={{ cursor: 'grab' }}
                />
                {hasOverride ? (
                  <Box sx={{ position: 'absolute', bottom: 4, left: 4, width: 6, height: 6, borderRadius: '999px', bgcolor: '#5d9eff' }} />
                ) : null}
              </>
            ) : (
              <ViewModuleIcon sx={{ fontSize: 14, color: 'rgba(220,230,245,0.18)' }} />
            )}
          </Box>
        )
      })}
    </Box>
  )
}

function PixelEditorCanvas({
  tile,
  tileWidth,
  tileHeight,
  sourceImageUrl,
  sourceOffsetX,
  sourceOffsetY,
  blockedColors,
  deletedPixels,
  mode,
  onTogglePixel,
  onPickColor,
}: {
  tile: ExtractedTile
  tileWidth: number
  tileHeight: number
  sourceImageUrl?: string
  sourceOffsetX: number
  sourceOffsetY: number
  blockedColors: string[]
  deletedPixels: string[]
  mode: PixelEditMode
  onTogglePixel: (x: number, y: number) => void
  onPickColor: (color: string) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const originalImageDataRef = useRef<ImageData | null>(null)
  const isComposedTile = String(tile.hash).startsWith('existing-')
  const occurrence = tile.sourceOccurrences[0]
  const usesSourceSheet = Boolean(sourceImageUrl && occurrence && !isComposedTile)
  const usesComposedSheet = Boolean(isComposedTile && occurrence)
  const sourceX = usesSourceSheet || usesComposedSheet ? (occurrence?.x ?? 0) + sourceOffsetX : 0
  const sourceY = usesSourceSheet || usesComposedSheet ? (occurrence?.y ?? 0) + sourceOffsetY : 0
  const imageUrl = usesSourceSheet ? sourceImageUrl! : tile.imageUrl

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      const sourceCanvas = document.createElement('canvas')
      sourceCanvas.width = tileWidth
      sourceCanvas.height = tileHeight
      const sourceCtx = sourceCanvas.getContext('2d')
      if (sourceCtx) {
        sourceCtx.imageSmoothingEnabled = false
        sourceCtx.drawImage(image, sourceX, sourceY, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight)
        originalImageDataRef.current = sourceCtx.getImageData(0, 0, tileWidth, tileHeight)
      }
      drawFilteredTile(ctx, image, sourceX, sourceY, tileWidth, tileHeight, blockedColors, deletedPixels)
    }
    image.src = imageUrl
  }, [blockedColors, deletedPixels, imageUrl, sourceX, sourceY, tileHeight, tileWidth])

  const handlePixelClick = (x: number, y: number) => {
    if (mode === 'delete') {
      onTogglePixel(x, y)
      return
    }
    const imageData = originalImageDataRef.current
    if (!imageData) return
    const offset = (y * tileWidth + x) * 4
    if (imageData.data[offset + 3] === 0) return
    onPickColor(rgbToHex(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2]))
  }

  return (
    <Box sx={{ width: '100%', minWidth: 0, overflowX: 'hidden', border: '1px solid rgba(255,255,255,0.08)', p: 1.25, boxSizing: 'border-box', display: 'grid', placeItems: 'center', ...previewPatternSx }}>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: TILE_PREVIEW_EDITOR_SIZE, minWidth: 0, aspectRatio: `${tileWidth} / ${tileHeight}`, overflow: 'hidden' }}>
        <Box component="canvas" ref={canvasRef} width={tileWidth} height={tileHeight} sx={{ width: '100%', height: '100%', display: 'block', imageRendering: 'pixelated' }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${tileWidth}, 1fr)`, gridTemplateRows: `repeat(${tileHeight}, 1fr)` }}>
        {Array.from({ length: tileWidth * tileHeight }, (_, index) => {
          const x = index % tileWidth
          const y = Math.floor(index / tileWidth)
          const removed = deletedPixels.includes(`${x},${y}`)
          return (
            <Box
              key={`${x}-${y}`}
              onClick={() => handlePixelClick(x, y)}
              sx={{
                borderRight: x < tileWidth - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                borderBottom: y < tileHeight - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                bgcolor: removed ? 'rgba(77,156,255,0.32)' : 'transparent',
                cursor: mode === 'delete' ? 'crosshair' : 'copy',
                '&:hover': {
                  bgcolor: removed ? 'rgba(77,156,255,0.42)' : 'rgba(255,255,255,0.08)',
                },
              }}
            />
          )
        })}
        </Box>
      </Box>
    </Box>
  )
}

function drawFilteredTile(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  tileWidth: number,
  tileHeight: number,
  blockedColors: string[],
  deletedPixels: string[],
) {
  ctx.clearRect(0, 0, tileWidth, tileHeight)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(image, sourceX, sourceY, tileWidth, tileHeight, 0, 0, tileWidth, tileHeight)
  if (blockedColors.length === 0 && deletedPixels.length === 0) return

  const imageData = ctx.getImageData(0, 0, tileWidth, tileHeight)
  const blocked = new Set(blockedColors.map((color) => normalizeColorHex(color)).filter((color): color is string => Boolean(color)))
  const deleted = new Set(deletedPixels)
  for (let y = 0; y < tileHeight; y += 1) {
    for (let x = 0; x < tileWidth; x += 1) {
      const offset = (y * tileWidth + x) * 4
      const color = rgbToHex(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])
      if (deleted.has(`${x},${y}`) || blocked.has(color)) {
        imageData.data[offset + 3] = 0
      }
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

function normalizeColorHex(color: string) {
  const value = color.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(value)) return value
  if (/^[0-9a-f]{6}$/.test(value)) return `#${value}`
  return null
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

function MaskPresetSwatch({ preset }: { preset: MaskPreset }) {
  const preview = preset === 'custom' ? customPreviewMask() : presetCollisionMask(preset)
  return (
    <Box
      sx={{
        width: 24,
        height: 24,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(4, 1fr)',
        gap: '1px',
        flexShrink: 0,
      }}
    >
      {Array.from({ length: 16 }, (_, index) => {
        const x = (index % 4) * 4
        const y = Math.floor(index / 4) * 4
        const filled = preview.slice(y, y + 4).some((row) => row.slice(x, x + 4).some(Boolean))
        return (
          <Box
            key={index}
            sx={{
              borderRadius: '2px',
              background: filled ? 'rgba(232,75,74,0.78)' : preset === 'center' || preset === 'custom' ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.08)',
              border: filled ? '1px solid rgba(232,75,74,0.16)' : '1px solid transparent',
            }}
          />
        )
      })}
    </Box>
  )
}

function EmptySurface({ message }: { message: string }) {
  return (
    <Box sx={{ borderRadius: '2px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.015)', minHeight: 120, width: '100%', maxWidth: '100%', display: 'grid', placeItems: 'center', px: 3, textAlign: 'center', minWidth: 0 }}>
      <Typography sx={{ fontSize: 13, color: '#8b949e', lineHeight: 1.5 }}>{message}</Typography>
    </Box>
  )
}

function defaultHitboxForType(type: TileType, solid: boolean): TileHitbox {
  if (!solid) return { offsetX: 0, offsetY: 0, width: 0, height: 0 }
  if (type === 'wall') return { offsetX: 0, offsetY: 0, width: 16, height: 16 }
  if (type === 'water') return { offsetX: 0, offsetY: 12, width: 16, height: 4 }
  if (type === 'object') return { offsetX: 2, offsetY: 6, width: 12, height: 10 }
  return { offsetX: 0, offsetY: 0, width: 16, height: 16 }
}

function tileOverrideCollisionMask(override: TileOverride) {
  return override.collisionMask ?? null
}

function buildEffectiveMask(overrideMask: boolean[][] | null, solid: boolean) {
  if (overrideMask) return normalizeMask(overrideMask)
  return solid ? fullMask() : emptyMask()
}

function emptyMask() {
  return Array.from({ length: TILE_SIZE }, () => Array.from({ length: TILE_SIZE }, () => false))
}

function fullMask() {
  return Array.from({ length: TILE_SIZE }, () => Array.from({ length: TILE_SIZE }, () => true))
}

function presetCollisionMask(preset: Exclude<MaskPreset, 'custom'>) {
  const mask = emptyMask()
  if (preset === 'full') return fullMask()
  if (preset === 'top') {
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 16; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'bottom') {
    for (let y = 8; y < 16; y += 1) for (let x = 0; x < 16; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'left') {
    for (let y = 0; y < 16; y += 1) for (let x = 0; x < 8; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'right') {
    for (let y = 0; y < 16; y += 1) for (let x = 8; x < 16; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'cornerTl') {
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'cornerTr') {
    for (let y = 0; y < 8; y += 1) for (let x = 8; x < 16; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'cornerBl') {
    for (let y = 8; y < 16; y += 1) for (let x = 0; x < 8; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'cornerBr') {
    for (let y = 8; y < 16; y += 1) for (let x = 8; x < 16; x += 1) mask[y][x] = true
    return mask
  }
  if (preset === 'notCornerTl') {
    const next = fullMask()
    for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) next[y][x] = false
    return next
  }
  if (preset === 'notCornerTr') {
    const next = fullMask()
    for (let y = 0; y < 8; y += 1) for (let x = 8; x < 16; x += 1) next[y][x] = false
    return next
  }
  if (preset === 'notCornerBl') {
    const next = fullMask()
    for (let y = 8; y < 16; y += 1) for (let x = 0; x < 8; x += 1) next[y][x] = false
    return next
  }
  if (preset === 'notCornerBr') {
    const next = fullMask()
    for (let y = 8; y < 16; y += 1) for (let x = 8; x < 16; x += 1) next[y][x] = false
    return next
  }
  for (let y = 2; y < 14; y += 1) for (let x = 2; x < 14; x += 1) mask[y][x] = true
  return mask
}

function customPreviewMask() {
  const mask = emptyMask()
  ;[
    [1, 2], [4, 1], [6, 5], [2, 7],
    [9, 3], [12, 6], [14, 2], [10, 9],
    [3, 10], [7, 12], [5, 14], [11, 13],
    [13, 10], [15, 15], [0, 12], [8, 7],
  ].forEach(([x, y]) => {
    mask[y][x] = true
  })
  return mask
}

function presetLabel(preset: MaskPreset) {
  if (preset === 'top') return 'Top half'
  if (preset === 'bottom') return 'Bottom half'
  if (preset === 'cornerTl') return 'Corner top left'
  if (preset === 'cornerTr') return 'Corner top right'
  if (preset === 'cornerBl') return 'Corner bottom left'
  if (preset === 'cornerBr') return 'Corner bottom right'
  if (preset === 'notCornerTl') return 'Without top left corner'
  if (preset === 'notCornerTr') return 'Without top right corner'
  if (preset === 'notCornerBl') return 'Without bottom left corner'
  if (preset === 'notCornerBr') return 'Without bottom right corner'
  if (preset === 'custom') return 'Custom'
  if (preset === 'full') return 'Full'
  if (preset === 'left') return 'Left half'
  if (preset === 'right') return 'Right half'
  if (preset === 'center') return 'Center block'
  return capitalize(preset)
}

function normalizeMask(mask: boolean[][]) {
  return Array.from({ length: TILE_SIZE }, (_, y) =>
    Array.from({ length: TILE_SIZE }, (_, x) => Boolean(mask[y]?.[x])),
  )
}

function cloneMask(mask: boolean[][]) {
  return mask.map((row) => [...row])
}

function hasAnyCollision(mask: boolean[][]) {
  return mask.some((row) => row.some(Boolean))
}

function deriveHitboxFromMask(mask: boolean[][]): TileHitbox {
  let minX = TILE_SIZE
  let minY = TILE_SIZE
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < TILE_SIZE; y += 1) {
    for (let x = 0; x < TILE_SIZE; x += 1) {
      if (!mask[y][x]) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  if (maxX === -1 || maxY === -1) {
    return { offsetX: 0, offsetY: 0, width: 0, height: 0 }
  }
  return {
    offsetX: minX,
    offsetY: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  }
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function colorForType(type: string) {
  if (type === 'wall') return '#ef9f27'
  if (type === 'water') return '#5d9eff'
  if (type === 'object') return '#c0dd97'
  return '#8b949e'
}

function groupRowSx(active: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    px: 1.25,
    py: 0.875,
    borderRadius: '4px',
    background: active ? 'rgba(93,158,255,0.11)' : 'transparent',
    cursor: 'pointer',
    transition: 'background 100ms',
    '&:hover': {
      background: active ? 'rgba(93,158,255,0.15)' : 'rgba(255,255,255,0.04)',
    },
  } as const
}

const inspectorFieldSx = {
  '& .MuiInputBase-root': {
    height: 36,
    color: 'rgba(240,245,255,0.9)',
    fontSize: 14,
    fontWeight: 500,
  },
  '& .MuiInputBase-input': {
    fontSize: 14,
    color: 'rgba(240,245,255,0.9)',
    py: 0.5,
  },
  '& .MuiInputLabel-root': {
    fontSize: 11,
    color: 'rgba(220,230,245,0.56)',
    letterSpacing: '0.04em',
  },
  '& .MuiInput-underline:before': {
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  '& .MuiInput-underline:hover:not(.Mui-disabled):before': {
    borderBottomColor: 'rgba(255,255,255,0.22)',
  },
  '& .MuiInput-underline:after': {
    borderBottomColor: '#5d9eff',
  },
}

const stateInlineFieldSx = {
  ...inspectorFieldSx,
  '& .MuiInputBase-root': {
    height: 34,
    color: 'rgba(240,245,255,0.9)',
    fontSize: 14,
    fontWeight: 500,
  },
  '& .MuiInputBase-input': {
    fontSize: 14,
    color: 'rgba(240,245,255,0.9)',
    py: 0.45,
  },
}

const stateOffsetFieldSx = {
  ...inspectorFieldSx,
  flex: '0 0 54px',
  width: 54,
  '& .MuiInputBase-root': {
    height: 34,
    color: 'rgba(240,245,255,0.9)',
    fontSize: 13,
    fontWeight: 500,
  },
  '& .MuiInputBase-input': {
    fontSize: 13,
    color: 'rgba(240,245,255,0.9)',
    py: 0.45,
    textAlign: 'right',
  },
  '& .MuiInputLabel-root': {
    fontSize: 10,
    color: 'rgba(220,230,245,0.56)',
    letterSpacing: '0.04em',
  },
}

const inspectorSelectSx = {
  '& .MuiSelect-select': {
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(240,245,255,0.9)',
    py: 0.75,
  },
  '&:before': {
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  '&:hover:not(.Mui-disabled):before': {
    borderBottomColor: 'rgba(255,255,255,0.22)',
  },
  '&:after': {
    borderBottomColor: '#5d9eff',
  },
  '& .MuiSvgIcon-root': {
    color: 'rgba(220,230,245,0.48)',
  },
}

const stateCollisionSelectSx = {
  ...inspectorSelectSx,
  '& .MuiSelect-select': {
    fontSize: 14,
    fontWeight: 500,
    color: 'rgba(240,245,255,0.9)',
    py: 0.75,
    minWidth: 112,
    whiteSpace: 'nowrap',
  },
}

const miniActionSx = {
  height: 30,
  px: 1.25,
  fontSize: 12,
  textTransform: 'none',
  borderRadius: '4px',
  color: '#8b949e',
  background: 'transparent',
  border: '1px solid rgba(255,255,255,0.07)',
  '&:hover': {
    background: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
}

const previewPatternSx = {
  backgroundColor: '#080c12',
  backgroundImage: `
    linear-gradient(45deg, #0d1118 25%, transparent 25%),
    linear-gradient(-45deg, #0d1118 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #0d1118 75%),
    linear-gradient(-45deg, transparent 75%, #0d1118 75%)
  `,
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
} as const

const toolbarNumberFieldSx = {
  width: 54,
  '& .MuiOutlinedInput-root': {
    height: 40,
    borderRadius: '8px',
    background: '#111923',
    color: '#d6dee8',
    '& fieldset': {
      borderColor: 'rgba(255,255,255,0.12)',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(255,255,255,0.12)',
    },
    '&.Mui-focused fieldset': {
      borderColor: 'rgba(255,255,255,0.12)',
    },
  },
  '& .MuiInputBase-input': {
    py: 0,
    px: 1,
    fontSize: 12,
    textAlign: 'center',
  },
} as const

function pixelModeButtonSx(active: boolean) {
  return {
    width: 32,
    height: 32,
    borderRadius: '4px',
    color: active ? '#d8ecff' : '#8b949e',
    background: active ? 'rgba(77,156,255,0.16)' : 'transparent',
    border: active ? '1px solid rgba(77,156,255,0.45)' : '1px solid rgba(255,255,255,0.07)',
    '&:hover': {
      background: active ? 'rgba(77,156,255,0.22)' : 'rgba(255,255,255,0.04)',
      borderColor: active ? 'rgba(77,156,255,0.55)' : 'rgba(255,255,255,0.1)',
    },
  } as const
}
