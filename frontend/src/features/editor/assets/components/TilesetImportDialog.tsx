import { Alert, Box, Button, FormControl, MenuItem, Select, Typography } from '@mui/material'
import { useEffect } from 'react'
import { AppDialog } from '../../components/AppDialog'
import { useAssignTileToTilesetGroupMutation } from '../../api/editorApi'
import { TargetSelector } from './TargetSelector'
import { TilesetOrganizeCollisionStep } from './TilesetOrganizeCollisionStep'
import { slotForTileIndex } from './tilesetImportUtils'
import type { TilesetImportDialogProps } from './types'
import { useTilesetImport } from './useTilesetImport'
import { editorTokens } from '../../../../app/theme'

export function TilesetImportDialog(props: TilesetImportDialogProps) {
  const {
    step,
    error,
    handleUpload,
    file,
    setFile,
    imageUrl,
    imageSize,
    selectedDestinationTilesetId,
    setSelectedDestinationTilesetId,
    allTiles,
    approvedTiles,
    gridW,
    gridH,
    activeGroup,
    groups,
    newGroupName,
    setNewGroupName,
    organizeSelectedTileIds,
    selectedLayoutTileId,
    setSelectedLayoutTileId,
    draggedLayoutItem,
    setDraggedLayoutItem,
    setOrganizeSelectedTileIds,
    handleSetActiveGroupId,
    handleToggleTile,
    handleAddGroup,
    handleCreateLocalGroup,
    handleDeleteGroup,
    handleAssignSelectedToGroup,
    handleUpdateGroupDimension,
    handleUpdateGroupTileType,
    handleUpdateGroupMeta,
    handleUpdateTileOverride,
    handleAppendAnimationFrame,
    handleClearTileOverride,
    handleMoveLayoutItem,
    handleRemoveTileFromGroup,
    handleMoveTileToGroup,
    handleMoveTileToTilesetGroup,
    handleDuplicateTileToGroup,
    handleRemoveTileFromSpecificGroup,
    handleCommitAssignedTileSlot,
    handleToggleSourceRegion,
    handleCreateSourceRegionTile,
  } = useTilesetImport(props)
  const [assignTileToGroup] = useAssignTileToTilesetGroupMutation()
  const destinationTilesets = (props.availableTilesets ?? []).filter((tileset) => tileset.assetType === 'environment')

  useEffect(() => {
    if (!props.open || step !== 0 || !selectedDestinationTilesetId) return
    void handleUpload()
  }, [handleUpload, props.open, selectedDestinationTilesetId, step])

  const handleAssignSelectedTiles = () => {
    if (!activeGroup || !selectedDestinationTilesetId || !file || organizeSelectedTileIds.length === 0) {
      handleAssignSelectedToGroup()
      return
    }
    const selectedTileset = destinationTilesets.find((tileset) => tileset.id === selectedDestinationTilesetId)
    if (!selectedTileset) return
    const selectedTiles = allTiles.filter((tile) => organizeSelectedTileIds.includes(tile.id) && !String(tile.hash).startsWith('existing-'))
    const beforeSlots = new Set(
      (activeGroup.tileRefs ?? [])
        .map((ref) => allTiles.find((tile) => tile.id === ref.tileId))
        .filter((tile): tile is typeof allTiles[number] => Boolean(tile))
        .map((tile) => slotForTileIndex(tile.index, selectedTileset)),
    )
    const tileOverrides = (activeGroup.metadata.tileOverrides ?? {}) as Record<string, { blockedColors?: string[]; deletedPixels?: string[]; sourceOffsetX?: number; sourceOffsetY?: number }>
    handleAssignSelectedToGroup()
    for (const tile of selectedTiles) {
      const occurrence = tile.sourceOccurrences[0]
      if (!occurrence) continue
      const override = tileOverrides[String(tile.id)] ?? {}
      void assignTileToGroup({
        projectId: props.projectId,
        tilesetId: Number(selectedDestinationTilesetId),
        groupId: activeGroup.id,
        sourceImage: file,
        tile: {
          clientId: String(tile.id),
          sourceX: occurrence.x + Number(override.sourceOffsetX ?? 0),
          sourceY: occurrence.y + Number(override.sourceOffsetY ?? 0),
          width: gridW,
          height: gridH,
          blockedColors: override.blockedColors ?? [],
          deletedPixels: override.deletedPixels ?? [],
          animated: false,
          frames: null,
        },
      }).unwrap().then((updatedTileset) => {
        const targetGroup = updatedTileset.groups.find((group) => String(group.id) === String(activeGroup.id))
        const assignedSlot = (targetGroup?.tiles ?? []).find((slot) => !beforeSlots.has(slot))
        if (assignedSlot) {
          beforeSlots.add(assignedSlot)
          handleCommitAssignedTileSlot(tile.id, assignedSlot, updatedTileset)
        }
      }).catch(() => {
        // The local optimistic tile remains visible for now; the dialog-level error handling can be wired to per-tile states next.
      })
    }
  }

  return (
    <AppDialog
      open={props.open}
      onClose={props.onClose}
      title="Import tiles"
      height="min(900px, calc(100vh - 40px))"
      contentSx={{ p: 0, overflow: 'hidden' }}
    >
      {error && (
        <Box sx={{ px: 3, pt: 1.5, flexShrink: 0 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TilesetOrganizeCollisionStep
            allTiles={allTiles}
            approvedTiles={approvedTiles}
            sourceImageUrl={imageUrl || undefined}
            sourceImageWidth={imageSize.width}
            sourceImageHeight={imageSize.height}
            sourceGridW={gridW}
            sourceGridH={gridH}
            importWorkspace
            sourceToolbarContent={
              <ImportCanvasToolbar
                file={file}
                tilesets={destinationTilesets}
                selectedTilesetId={selectedDestinationTilesetId}
                onSelectTileset={setSelectedDestinationTilesetId}
                onSelectFile={setFile}
              />
            }
            targetSelector={
              <TargetSelector
                projectId={props.projectId}
                tilesets={destinationTilesets}
                selectedTilesetId={selectedDestinationTilesetId}
                selectedGroupId={activeGroup?.id ?? null}
                groups={groups}
                hideTilesetSelector
                onSelectTileset={setSelectedDestinationTilesetId}
                onSelectGroup={handleSetActiveGroupId}
                onLocalGroupCreated={handleCreateLocalGroup}
              />
            }
            crossTilesetTargets={destinationTilesets
              .filter((tileset) => tileset.assetType === 'environment' && tileset.id !== selectedDestinationTilesetId)
              .map((tileset) => ({
                tilesetId: tileset.id,
                tilesetName: tileset.name,
                groups: (tileset.groups ?? [])
                  .filter((group) => !group.system)
                  .map((group) => ({
                    id: String(group.id),
                    name: group.name,
                    width: Number(group.metadata?.width ?? 1),
                    height: Number(group.metadata?.height ?? 1),
                  })),
              }))
              .filter((target) => target.groups.length > 0)}
            onToggleSourceRegion={imageUrl ? handleToggleSourceRegion : undefined}
            onCreateSourceRegionTile={imageUrl ? handleCreateSourceRegionTile : undefined}
            activeGroup={activeGroup}
            groups={groups}
            newGroupName={newGroupName}
            setNewGroupName={setNewGroupName}
            organizeSelectedTileIds={organizeSelectedTileIds}
            selectedLayoutTileId={selectedLayoutTileId}
            draggedLayoutItem={draggedLayoutItem}
            onSetActiveGroupId={handleSetActiveGroupId}
            onSetSelectedLayoutTileId={setSelectedLayoutTileId}
            onSetDraggedLayoutItem={setDraggedLayoutItem}
            onSetOrganizeSelectedTileIds={setOrganizeSelectedTileIds}
            onToggleTile={handleToggleTile}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
            onAssignSelectedToGroup={handleAssignSelectedTiles}
            onUpdateGroupDimension={handleUpdateGroupDimension}
            onUpdateGroupTileType={handleUpdateGroupTileType}
            onUpdateGroupMeta={handleUpdateGroupMeta}
            onUpdateTileOverride={handleUpdateTileOverride}
            onAppendAnimationFrame={handleAppendAnimationFrame}
            onClearTileOverride={handleClearTileOverride}
            onMoveLayoutItem={handleMoveLayoutItem}
            onRemoveTileFromGroup={handleRemoveTileFromGroup}
            onMoveTileToGroup={handleMoveTileToGroup}
            onMoveTileToTilesetGroup={handleMoveTileToTilesetGroup}
            onDuplicateTileToGroup={handleDuplicateTileToGroup}
            onRemoveTileFromSpecificGroup={handleRemoveTileFromSpecificGroup}
          />
      </Box>
    </AppDialog>
  )
}

function ImportCanvasToolbar({
  file,
  tilesets,
  selectedTilesetId,
  onSelectTileset,
  onSelectFile,
}: {
  file: File | null
  tilesets: Array<{ id: number; name: string }>
  selectedTilesetId: number | ''
  onSelectTileset: (tilesetId: number | '') => void
  onSelectFile: (file: File | null) => void
}) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      <Button
        component="label"
        size="small"
        sx={{
          height: editorTokens.control.heightCompact,
          px: 1.25,
          borderRadius: `${editorTokens.control.radius}px`,
          border: '1px solid rgba(255,255,255,0.10)',
          color: file ? '#d6dee8' : '#8f9baa',
          textTransform: 'none',
          fontSize: 12,
          maxWidth: 180,
          overflow: 'hidden',
        }}
      >
        <Typography noWrap component="span" sx={{ fontSize: 12, maxWidth: 150 }}>
          {file ? file.name : 'Choose PNG'}
        </Typography>
        <Box
          component="input"
          hidden
          type="file"
          accept=".png,image/png"
          onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
        />
      </Button>
      <FormControl variant="standard" size="small" sx={{ minWidth: 150, maxWidth: 220 }}>
        <Select
          value={selectedTilesetId === '' ? '' : String(selectedTilesetId)}
          displayEmpty
          disableUnderline
          onChange={(event) => {
            const value = event.target.value
            onSelectTileset(value === '' ? '' : Number(value))
          }}
          sx={{
            fontSize: 12,
            color: '#d6dee8',
            '& .MuiSelect-select': { py: 0.25, px: 0.5 },
            '& .MuiSvgIcon-root': { fontSize: 16, color: '#8f9baa' },
          }}
        >
          <MenuItem value="">Select tileset</MenuItem>
          {tilesets.map((tileset) => (
            <MenuItem key={tileset.id} value={String(tileset.id)}>{tileset.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}
