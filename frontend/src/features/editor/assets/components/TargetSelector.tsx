import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import { Box, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import {
  useCreateTilesetGroupMutation,
  useCreateTilesetMutation,
} from '../../api/editorApi'
import type { TileType, Tileset } from '../../model/types'
import type { GroupDraft } from './types'

type TilesetKind = 'background' | 'object'

type Props = {
  projectId: number
  tilesets: Tileset[]
  selectedTilesetId: number | ''
  selectedGroupId: string | null
  groups: GroupDraft[]
  hideTilesetSelector?: boolean
  onSelectTileset: (tilesetId: number | '') => void
  onSelectGroup: (groupId: string | null) => void
  onLocalGroupCreated: (id: string, name: string, tileType: TileType | 'object', width: number, height: number) => void
}

export function TargetSelector({
  projectId,
  tilesets,
  selectedTilesetId,
  selectedGroupId,
  groups,
  hideTilesetSelector = false,
  onSelectTileset,
  onSelectGroup,
  onLocalGroupCreated,
}: Props) {
  const [createTileset] = useCreateTilesetMutation()
  const [createGroup] = useCreateTilesetGroupMutation()
  const [creatingTileset, setCreatingTileset] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [tilesetName, setTilesetName] = useState('')
  const [tilesetKind, setTilesetKind] = useState<TilesetKind>('background')
  const [groupName, setGroupName] = useState('')
  const [groupType, setGroupType] = useState<TileType | 'object'>('floor')
  const [groupW, setGroupW] = useState(1)
  const [groupH, setGroupH] = useState(1)
  const [createdTilesets, setCreatedTilesets] = useState<Tileset[]>([])

  const allTilesets = useMemo(() => {
    const editorTilesets = tilesets.filter(isEditorTileset)
    const ids = new Set(editorTilesets.map((tileset) => tileset.id))
    return [...editorTilesets, ...createdTilesets.filter((tileset) => !ids.has(tileset.id))]
  }, [createdTilesets, tilesets])
  const selectedTileset = allTilesets.find((tileset) => tileset.id === selectedTilesetId) ?? null
  const backgroundTilesets = useMemo(() => allTilesets.filter((tileset) => tilesetType(tileset) === 'background'), [allTilesets])
  const objectTilesets = useMemo(() => allTilesets.filter((tileset) => tilesetType(tileset) === 'object'), [allTilesets])

  const handleCreateTileset = async () => {
    const name = tilesetName.trim()
    if (!name) return
    const created = await createTileset({
      projectId,
      body: {
        name,
        type: tilesetKind,
        assetType: 'environment',
        tileWidth: 16,
        tileHeight: 16,
        columns: 16,
        rows: 1,
        margin: 0,
        spacing: 0,
        metadata: { type: tilesetKind },
      },
    }).unwrap()
    setCreatedTilesets((current) => [...current, created])
    setTilesetName('')
    setCreatingTileset(false)
    onSelectTileset(created.id)
  }

  const cancelCreateTileset = () => {
    setCreatingTileset(false)
    setTilesetName('')
    setTilesetKind('background')
  }

  const handleCreateGroup = async () => {
    if (!selectedTileset) return
    const name = groupName.trim()
    if (!name) return
    const width = Math.max(1, groupW)
    const height = Math.max(1, groupH)
    const type = tilesetType(selectedTileset) === 'object' ? 'object' : groupType
    const metadata = {
      width,
      height,
      tileType: type,
      solid: type === 'wall' || type === 'object',
      defaultCollision: type === 'wall' || type === 'object' ? 'solid' : 'none',
    }
    const updated = await createGroup({
      projectId,
      tilesetId: selectedTileset.id,
      body: { name, width, height, type, metadata },
    }).unwrap()
    const createdGroup = [...(updated.groups ?? [])].reverse().find((group) => group.name === name)
    const groupId = createdGroup ? String(createdGroup.id) : crypto.randomUUID()
    onLocalGroupCreated(groupId, name, type, width, height)
    onSelectGroup(groupId)
    setGroupName('')
    setCreatingGroup(false)
  }

  const cancelCreateGroup = () => {
    setCreatingGroup(false)
    setGroupName('')
    setGroupType('floor')
    setGroupW(1)
    setGroupH(1)
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        pb: 2,
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa6b5' }}>
        Assignment target
      </Typography>
      {!hideTilesetSelector ? (
        <Box sx={selectorRowSx}>
          {creatingTileset ? (
            <TextField
              variant="standard"
              size="small"
              label="New tileset"
              value={tilesetName}
              autoFocus
              onChange={(event) => setTilesetName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') cancelCreateTileset()
                if (event.key === 'Enter') void handleCreateTileset()
              }}
              sx={selectorControlSx}
            />
          ) : (
            <FormControl variant="standard" size="small" sx={selectorControlSx}>
              <InputLabel>Target tileset</InputLabel>
              <Select
                value={selectedTilesetId === '' ? '' : String(selectedTilesetId)}
                onChange={(event) => {
                  const value = event.target.value
                  onSelectTileset(value === '' ? '' : Number(value))
                }}
              >
                <MenuItem value="">Choose tileset</MenuItem>
                <MenuItem disabled sx={{ fontSize: 11, color: '#667383' }}>Background tilesets</MenuItem>
                {backgroundTilesets.map((tileset) => <MenuItem key={tileset.id} value={String(tileset.id)}>{tileset.name}</MenuItem>)}
                <MenuItem disabled sx={{ fontSize: 11, color: '#667383' }}>Object tilesets</MenuItem>
                {objectTilesets.map((tileset) => <MenuItem key={tileset.id} value={String(tileset.id)}>{tileset.name}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          <Tooltip title={creatingTileset ? 'Create tileset' : 'New tileset'}>
            <span>
              <IconButton
                size="small"
                disabled={creatingTileset && !tilesetName.trim()}
                onClick={() => creatingTileset ? void handleCreateTileset() : setCreatingTileset(true)}
                sx={iconButtonSx}
              >
                {creatingTileset ? <CheckIcon sx={{ fontSize: 17 }} /> : <AddIcon sx={{ fontSize: 17 }} />}
              </IconButton>
            </span>
          </Tooltip>
          {creatingTileset ? (
            <Tooltip title="Cancel">
              <IconButton size="small" onClick={cancelCreateTileset} sx={iconButtonSx}>
                <CloseIcon sx={{ fontSize: 17 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Box>
      ) : null}
      {creatingTileset && !hideTilesetSelector ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', minHeight: 30 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={tilesetKind}
            onChange={(_event, value) => { if (value) setTilesetKind(value) }}
            sx={{ '& .MuiToggleButton-root': { height: 30, px: 1.5, fontSize: 11, textTransform: 'none' } }}
          >
            <ToggleButton value="background">Background</ToggleButton>
            <ToggleButton value="object">Object</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      ) : null}
      <Box sx={selectorRowSx}>
        {creatingGroup ? (
          <TextField
            variant="standard"
            size="small"
            label="New group"
            value={groupName}
            autoFocus
            onChange={(event) => setGroupName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') cancelCreateGroup()
              if (event.key === 'Enter') void handleCreateGroup()
            }}
            sx={selectorControlSx}
          />
        ) : (
          <FormControl variant="standard" size="small" disabled={!selectedTileset} sx={selectorControlSx}>
            <InputLabel>Target group</InputLabel>
            <Select
              value={selectedGroupId ?? ''}
              onChange={(event) => onSelectGroup(event.target.value ? String(event.target.value) : null)}
            >
              <MenuItem value="">Choose group</MenuItem>
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        <Tooltip title={creatingGroup ? 'Create group' : 'New group'}>
          <span>
            <IconButton
              size="small"
              disabled={!selectedTileset || (creatingGroup && !groupName.trim())}
              onClick={() => creatingGroup ? void handleCreateGroup() : setCreatingGroup(true)}
              sx={iconButtonSx}
            >
              {creatingGroup ? <CheckIcon sx={{ fontSize: 17 }} /> : <AddIcon sx={{ fontSize: 17 }} />}
            </IconButton>
          </span>
        </Tooltip>
        {creatingGroup ? (
          <Tooltip title="Cancel">
            <IconButton size="small" onClick={cancelCreateGroup} sx={iconButtonSx}>
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </Box>
      {creatingGroup ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: '48px 48px minmax(0, 1fr)', gap: 1, alignItems: 'end', minHeight: 45 }}>
            <TextField variant="standard" size="small" type="number" label="W" value={groupW} onChange={(event) => setGroupW(Number(event.target.value) || 1)} />
            <TextField variant="standard" size="small" type="number" label="H" value={groupH} onChange={(event) => setGroupH(Number(event.target.value) || 1)} />
            <FormControl variant="standard" size="small" disabled={selectedTileset ? tilesetType(selectedTileset) === 'object' : false}>
              <InputLabel>Type</InputLabel>
              <Select value={selectedTileset && tilesetType(selectedTileset) === 'object' ? 'object' : groupType} onChange={(event) => setGroupType(event.target.value as TileType)}>
                {selectedTileset && tilesetType(selectedTileset) === 'object' ? <MenuItem value="object">Object</MenuItem> : null}
                <MenuItem value="floor">Floor</MenuItem>
                <MenuItem value="wall">Wall</MenuItem>
                <MenuItem value="water">Water</MenuItem>
              </Select>
            </FormControl>
          </Box>
      ) : null}
    </Box>
  )
}

function tilesetType(tileset: Tileset): TilesetKind {
  return (tileset.type ?? tileset.metadata?.type) === 'object' ? 'object' : 'background'
}

function isEditorTileset(tileset: Tileset): boolean {
  return tileset.assetType === 'environment'
}

const iconButtonSx = {
  width: 30,
  height: 30,
  flexShrink: 0,
  color: '#d6dee8',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.10)',
  bgcolor: 'rgba(255,255,255,0.03)',
  '&:hover': {
    bgcolor: 'rgba(77,156,255,0.12)',
    borderColor: 'rgba(77,156,255,0.35)',
    color: '#4d9cff',
  },
}

const selectorRowSx = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 0.75,
  minHeight: 45,
}

const selectorControlSx = {
  flex: 1,
  minWidth: 0,
  height: 45,
  display: 'flex',
  justifyContent: 'flex-end',
  '& .MuiInputBase-root': {
    minHeight: 30,
  },
}
