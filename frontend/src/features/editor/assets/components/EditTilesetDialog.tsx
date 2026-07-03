import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { Box, Button, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { AppDialog } from '../../components/AppDialog'
import {
  useGetTilesetQuery,
  useUpdateTilesetGroupsMutation,
  useUpdateTilesetMutation,
} from '../../api/editorApi'
import type { ExtractedTile, TileType, Tileset } from '../../model/types'
import type { GroupDraft, TileOverride } from './types'
import { TileLayoutPreview } from './TilesetOrganizeCollisionStep'
import {
  groupsFromTileset,
  moveLayoutItem,
  normalizeLayout,
  slotForTileIndex,
  tilesFromTileset,
} from './tilesetImportUtils'

type Props = {
  open: boolean
  projectId: number
  tileset: Tileset | null
  onClose: () => void
}

export function EditTilesetDialog({ open, projectId, tileset, onClose }: Props) {
  const { data: freshTileset } = useGetTilesetQuery(tileset?.id ?? 0, { skip: !open || !tileset })
  const activeTileset = freshTileset ?? tileset
  const [updateTileset] = useUpdateTilesetMutation()
  const [updateGroups] = useUpdateTilesetGroupsMutation()
  const [draftName, setDraftName] = useState(activeTileset?.name ?? '')
  const [allTiles, setAllTiles] = useState<ExtractedTile[]>([])
  const [groups, setGroups] = useState<GroupDraft[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null)
  const [draggedItem, setDraggedItem] = useState<{ tileId: number | null; x: number; y: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setDraftName('')
      setAllTiles([])
      setGroups([])
      setSelectedGroupId(null)
      setSelectedTileId(null)
      setDraggedItem(null)
    }
  }, [open])

  useEffect(() => {
    if (!activeTileset || !open) return
    const tiles = tilesFromTileset(activeTileset)
    const nextGroups = groupsFromTileset(activeTileset, tiles)
    setDraftName(activeTileset.name)
    setAllTiles(tiles)
    setGroups(nextGroups)
    setSelectedGroupId((current) => current && nextGroups.some((group) => group.id === current) ? current : nextGroups[0]?.id ?? null)
    setSelectedTileId(null)
    setDraggedItem(null)
  }, [activeTileset?.id, activeTileset?.updatedAt, open])

  const activeGroup = groups.find((group) => group.id === selectedGroupId) ?? null
  const activeTileOverrides = useMemo(
    () => ((activeGroup?.metadata.tileOverrides ?? {}) as Record<string, TileOverride>),
    [activeGroup],
  )

  const persistGroups = (nextGroups: GroupDraft[]) => {
    if (!activeTileset) return
    setGroups(nextGroups)
    void updateGroups({
      projectId,
      tilesetId: activeTileset.id,
      groups: nextGroups.map((group, orderIndex) => {
        const isObjectTileset = tilesetType === 'object'
        const tileType = isObjectTileset ? 'object' : String(group.metadata.tileType ?? (group.name === 'Objects' ? 'object' : 'floor'))
        const isSystemObjectsGroup = !isObjectTileset && (tileType === 'object' || group.name === 'Objects' || String(group.metadata.systemRole) === 'objects')
        return {
          id: isSystemObjectsGroup ? 'objects' : group.id,
          name: isSystemObjectsGroup ? 'Objects' : group.name,
          type: tileType,
          system: isSystemObjectsGroup,
          orderIndex,
          solid: Boolean(group.metadata.solid ?? (tileType === 'wall' || tileType === 'object')),
          metadata: {
            ...group.metadata,
            tileType,
            systemRole: isSystemObjectsGroup ? 'objects' : group.metadata.systemRole,
          },
          tileRefs: group.tileRefs,
          tiles: group.tileRefs
            .map((ref) => {
              const tile = allTiles.find((candidate) => candidate.id === ref.tileId)
              return tile ? slotForTileIndex(tile.index, activeTileset) : null
            })
            .filter((slot): slot is string => slot != null),
        }
      }),
    }).unwrap()
  }

  const saveName = async () => {
    if (!activeTileset) return
    const name = draftName.trim()
    if (!name || name === activeTileset.name) return
    await saveTileset({ name })
  }

  const saveTileset = async (updates: { name?: string; type?: 'background' | 'object' }) => {
    if (!activeTileset) return
    const nextType = updates.type ?? tilesetType
    await updateTileset({
      tilesetId: activeTileset.id,
      body: {
        name: updates.name ?? (draftName.trim() || activeTileset.name),
        type: nextType,
        assetType: activeTileset.assetType,
        tileWidth: activeTileset.tileWidth,
        tileHeight: activeTileset.tileHeight,
        columns: activeTileset.columns,
        rows: activeTileset.rows,
        margin: activeTileset.margin,
        spacing: activeTileset.spacing,
        metadata: { ...(activeTileset.metadata ?? {}), type: nextType },
      },
    }).unwrap()
  }

  const updateGroup = (groupId: string, updater: (group: GroupDraft) => GroupDraft) => {
    persistGroups(groups.map((group) => group.id === groupId ? updater(group) : group))
  }

  const addGroup = () => {
    if (!activeTileset) return
    const id = crypto.randomUUID()
    const tileType = tilesetType === 'object' ? 'object' : 'floor'
    const solid = tileType === 'object'
    const nextGroup: GroupDraft = {
      id,
      name: `Group ${groups.filter((group) => String(group.metadata.systemRole) !== 'objects').length + 1}`,
      type: 'environment',
      tileRefs: [],
      metadata: { width: 1, height: 1, tileType, solid, defaultCollision: solid ? 'solid' : 'none', collisionBehavior: 'group' },
    }
    const nextGroups = [...groups, nextGroup]
    persistGroups(nextGroups)
    setSelectedGroupId(id)
  }

  const deleteGroup = (groupId: string) => {
    const group = groups.find((candidate) => candidate.id === groupId)
    if (!group || String(group.metadata.systemRole) === 'objects') return
    const nextGroups = groups.filter((candidate) => candidate.id !== groupId)
    persistGroups(nextGroups)
    setSelectedGroupId(nextGroups[0]?.id ?? null)
    setSelectedTileId(null)
  }

  const moveLayout = (source: { tileId: number | null; x: number; y: number }, target: { tileId: number | null; x: number; y: number }) => {
    if (!activeGroup) return
    persistGroups(groups.map((group) => group.id === activeGroup.id ? moveLayoutItem(group, source, target) : group))
  }

  const removeTile = (tileId: number) => {
    if (!activeGroup) return
    persistGroups(groups.map((group) => (
      group.id === activeGroup.id
        ? normalizeLayout({ ...group, tileRefs: group.tileRefs.filter((ref) => ref.tileId !== tileId) })
        : group
    )))
    setSelectedTileId((current) => current === tileId ? null : current)
  }

  const tilesetType = activeTileset
    ? (activeTileset.type ?? activeTileset.metadata?.type ?? 'background') === 'object' ? 'object' : 'background'
    : 'background'

  if (!activeTileset) return null

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Edit tileset"
      maxWidth="lg"
      height="min(860px, calc(100vh - 40px))"
      contentSx={{ overflow: 'hidden', p: 0 }}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 350px', minHeight: 0, flex: 1 }}>
        <Box sx={{ borderRight: '1px solid rgba(255,255,255,0.07)', p: 2, display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0 }}>
          <TextField
            variant="standard"
            label="Tileset name"
            value={draftName}
            disabled={!activeTileset}
            onChange={(event) => setDraftName(event.target.value)}
            onBlur={() => void saveName()}
          />
          <FormControl variant="standard" size="small" disabled={!activeTileset}>
            <InputLabel>Type</InputLabel>
            <Select
              value={tilesetType}
              label="Type"
              onChange={(event) => void saveTileset({ type: event.target.value as 'background' | 'object' })}
            >
              <MenuItem value="background">Background</MenuItem>
              <MenuItem value="object">Object</MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
            <Typography sx={sectionHeadingSx}>Groups</Typography>
            <Tooltip title="Add group">
              <span>
              <IconButton size="small" disabled={!activeTileset} onClick={addGroup} sx={{ color: '#4d9cff' }}>
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Stack spacing={0.75} sx={{ overflowY: 'auto', minHeight: 0 }}>
            {groups.length === 0 && !activeTileset ? (
              <Typography sx={{ fontSize: 12, color: '#667383', px: 1 }}>Select a tileset to edit groups.</Typography>
            ) : groups.map((group) => (
              <Box
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id)
                  setSelectedTileId(null)
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  bgcolor: selectedGroupId === group.id ? 'rgba(77,156,255,0.12)' : 'transparent',
                  color: selectedGroupId === group.id ? '#d6dee8' : '#8f9baa',
                  '&:hover': { bgcolor: selectedGroupId === group.id ? 'rgba(77,156,255,0.14)' : 'rgba(255,255,255,0.045)' },
                }}
              >
                <Box sx={{ width: 2, alignSelf: 'stretch', bgcolor: selectedGroupId === group.id ? '#4d9cff' : 'transparent' }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 13 }}>{group.name}</Typography>
                  <Typography sx={{ fontSize: 11, color: '#667383' }}>{Number(group.metadata.width ?? 1)}x{Number(group.metadata.height ?? 1)} · {group.tileRefs.length} tiles</Typography>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>

        <Box sx={{ minWidth: 0, overflowY: 'auto', p: 2.5, ...workspacePatternSx }}>
          {activeTileset ? (
            <TileLayoutPreview
              activeGroup={activeGroup}
              groups={groups}
              tiles={allTiles}
              selectedTileId={selectedTileId}
              draggedItem={draggedItem}
              tileOverrides={activeTileOverrides}
              tileWidth={activeTileset.tileWidth}
              tileHeight={activeTileset.tileHeight}
              highlightedTileId={null}
              fadingTileId={null}
              flashActive={false}
              onSetSelectedTileId={setSelectedTileId}
              onSetDraggedLayoutItem={setDraggedItem}
              onMoveLayoutItem={moveLayout}
              onRemoveTile={removeTile}
              onOpenContextMenu={() => undefined}
            />
          ) : (
            <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', border: '1px dashed rgba(255,255,255,0.08)', color: '#667383', fontSize: 13 }}>
              Select a tileset to preview its group layout.
            </Box>
          )}
        </Box>

        <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.07)', p: 2, overflowY: 'auto', minHeight: 0 }}>
          {activeGroup ? (
            <GroupDetails
              group={activeGroup}
              tilesetType={tilesetType}
              onDelete={() => deleteGroup(activeGroup.id)}
              onUpdate={(updates) => updateGroup(activeGroup.id, (group) => ({ ...group, ...updates }))}
              onUpdateMetadata={(metadata) => updateGroup(activeGroup.id, (group) => ({ ...group, metadata: { ...group.metadata, ...metadata } }))}
            />
          ) : !activeTileset ? (
            <DisabledGroupDetails />
          ) : (
            <Typography sx={{ fontSize: 13, color: '#667383' }}>Select a group.</Typography>
          )}
        </Box>
      </Box>
    </AppDialog>
  )
}

function DisabledGroupDetails() {
  return (
    <Stack spacing={2}>
      <Typography sx={sectionHeadingSx}>Group details</Typography>
      <TextField variant="standard" label="Name" value="" disabled />
      <Box sx={{ display: 'grid', gridTemplateColumns: '64px 64px minmax(0, 1fr)', gap: 1 }}>
        <TextField variant="standard" label="Cols" value="" disabled />
        <TextField variant="standard" label="Rows" value="" disabled />
        <TextField variant="standard" label="Type" value="" disabled />
      </Box>
      <Box sx={{ pt: 1, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Button disabled startIcon={<DeleteIcon />} sx={{ color: '#E24B4A', textTransform: 'none', fontSize: 12 }}>
          Delete group
        </Button>
      </Box>
    </Stack>
  )
}

function GroupDetails({
  group,
  tilesetType,
  onDelete,
  onUpdate,
  onUpdateMetadata,
}: {
  group: GroupDraft
  tilesetType: 'background' | 'object'
  onDelete: () => void
  onUpdate: (updates: Partial<GroupDraft>) => void
  onUpdateMetadata: (metadata: Record<string, unknown>) => void
}) {
  const isObjectsGroup = String(group.metadata.systemRole) === 'objects' || group.name === 'Objects'
  const width = Number(group.metadata.width ?? 1)
  const height = Number(group.metadata.height ?? 1)
  const type = String(group.metadata.tileType ?? 'floor')

  return (
    <Stack spacing={2}>
      <Typography sx={sectionHeadingSx}>Group details</Typography>
      <TextField
        variant="standard"
        label="Name"
        value={group.name}
        disabled={isObjectsGroup}
        onChange={(event) => onUpdate({ name: event.target.value })}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: tilesetType === 'object' || isObjectsGroup ? '1fr 1fr' : '64px 64px minmax(0, 1fr)', gap: 1 }}>
        <TextField
          variant="standard"
          label="Cols"
          type="number"
          value={width}
          onChange={(event) => onUpdateMetadata({ width: Math.max(1, Number(event.target.value) || 1) })}
        />
        <TextField
          variant="standard"
          label="Rows"
          type="number"
          value={height}
          onChange={(event) => onUpdateMetadata({ height: Math.max(1, Number(event.target.value) || 1) })}
        />
        {tilesetType !== 'object' && !isObjectsGroup ? (
          <FormControl variant="standard" size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              onChange={(event) => {
                const tileType = event.target.value as TileType
                const solid = tileType === 'wall'
                onUpdateMetadata({ tileType, solid, defaultCollision: solid ? 'solid' : 'none' })
              }}
            >
              <MenuItem value="floor">Floor</MenuItem>
              <MenuItem value="wall">Wall</MenuItem>
              <MenuItem value="water">Water</MenuItem>
            </Select>
          </FormControl>
        ) : null}
      </Box>
      <Box sx={{ pt: 1, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <Button
          disabled={isObjectsGroup}
          startIcon={<DeleteIcon />}
          onClick={onDelete}
          sx={{ color: '#E24B4A', textTransform: 'none', fontSize: 12 }}
        >
          Delete group
        </Button>
      </Box>
    </Stack>
  )
}

const sectionHeadingSx = {
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#9aa6b5',
  fontWeight: 700,
}

const workspacePatternSx = {
  backgroundColor: '#0f151d',
  backgroundImage: `
    radial-gradient(circle at center, rgba(255,255,255,0.025), transparent 58%),
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
  `,
  backgroundSize: '100% 100%, 40px 40px, 40px 40px',
}
