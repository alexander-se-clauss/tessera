import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import { editorTokens as tok } from '../../../app/theme'
import AddIcon from '@mui/icons-material/Add'
import MapIcon from '@mui/icons-material/Map'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import PublicIcon from '@mui/icons-material/Public'
import LayersIcon from '@mui/icons-material/Layers'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder'
import { useState } from 'react'
import type { GameMap, MapGroup, Project } from '../model/types'

type ProjectTreePanelProps = {
  project: Project | null
  maps: GameMap[]
  mapGroups: MapGroup[]
  activeMapId: number | null
  activeGroupId: number | null
  onSelectMap: (mapId: number) => void
  onSelectGroup: (groupId: number) => void
  onAddMap: () => void
  onCreateGroup: () => void
  onAddMapToGroup: (groupId: number) => void
}

export function ProjectTreePanel({
  project,
  maps,
  mapGroups,
  activeMapId,
  activeGroupId,
  onSelectMap,
  onSelectGroup,
  onAddMap,
  onCreateGroup,
  onAddMapToGroup,
}: ProjectTreePanelProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<number>>(new Set())
  const [ungroupedExpanded, setUngroupedExpanded] = useState(true)

  const toggleGroup = (groupId: number) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }

  const ungroupedMaps = maps.filter((m) => m.mapGroupId == null)
  const totalMaps = maps.length

  const groupOrder: Record<string, number> = { world: 0, dungeon: 1, area: 2 }
  const sortedGroups = [...mapGroups].sort((a, b) => {
    if (groupOrder[a.type] !== groupOrder[b.type]) return groupOrder[a.type] - groupOrder[b.type]
    return a.name.localeCompare(b.name)
  })

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        borderRadius: 0,
        background: tok.surface.panel,
        borderRight: `1px solid ${tok.border.colorMid}`,
      }}
    >
      {project ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.25, pt: 2, pb: 1 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              color: '#8f9baa',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              minWidth: 0,
              pr: 1,
            }}
            noWrap
          >
            {project.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
            <Tooltip title="Add group">
              <IconButton
                size="small"
                sx={{
                  p: 0.5,
                  borderRadius: 1,
                  color: '#8f9baa',
                  '&:hover': { background: 'rgba(255,255,255,0.045)', color: '#d6dee8' },
                }}
                onClick={onCreateGroup}
              >
                <CreateNewFolderIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Add map">
              <IconButton
                size="small"
                sx={{
                  p: 0.5,
                  borderRadius: 1,
                  color: '#8f9baa',
                  '&:hover': { background: 'rgba(255,255,255,0.045)', color: '#d6dee8' },
                }}
                onClick={onAddMap}
              >
                <AddIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      ) : null}

      <Box sx={{ flex: 1, px: 1.5, pb: 1.5, overflowY: 'auto', pt: project ? 0 : 1 }}>
        {!project || (mapGroups.length === 0 && maps.length === 0) ? (
          <Typography sx={{ px: 1.25, py: 1, fontSize: 12, color: '#667383' }}>
            No data
          </Typography>
        ) : (
          <>
            {sortedGroups.map((group) => {
              const groupMaps = maps.filter((m) => m.mapGroupId === group.id)
              const isExpanded = !collapsedGroups.has(group.id)
              const isActiveGroup = activeGroupId === group.id
              return (
                <Box key={group.id}>
                  <GroupHeader
                    group={group}
                    mapCount={groupMaps.length}
                    expanded={isExpanded}
                    active={isActiveGroup}
                    onToggleExpand={() => toggleGroup(group.id)}
                    onOpenEditor={() => onSelectGroup(group.id)}
                    onAddMap={() => onAddMapToGroup(group.id)}
                  />
                  {isExpanded &&
                    groupMaps.map((map) => (
                      <MapTreeItem
                        key={map.id}
                        map={map}
                        selected={map.id === activeMapId}
                        indent={2.75}
                        onClick={() => onSelectMap(map.id)}
                      />
                    ))}
                  {isExpanded && groupMaps.length === 0 && (
                    <Typography sx={{ pl: 2.75, py: 0.5, fontSize: 11, color: 'rgba(220,230,245,0.28)' }}>
                      No maps
                    </Typography>
                  )}
                </Box>
              )
            })}

            {ungroupedMaps.length > 0 || totalMaps === 0 ? (
              <Box>
                <UngroupedHeader
                  count={ungroupedMaps.length}
                  expanded={ungroupedExpanded}
                  onToggle={() => setUngroupedExpanded((p) => !p)}
                />
                {ungroupedExpanded &&
                  ungroupedMaps.map((map) => (
                    <MapTreeItem
                      key={map.id}
                      map={map}
                      selected={map.id === activeMapId}
                      indent={2.75}
                      onClick={() => onSelectMap(map.id)}
                    />
                  ))}
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </Box>
  )
}

function GroupHeader({
  group,
  mapCount,
  expanded,
  active,
  onToggleExpand,
  onOpenEditor,
  onAddMap,
}: {
  group: MapGroup
  mapCount: number
  expanded: boolean
  active: boolean
  onToggleExpand: () => void
  onOpenEditor: () => void
  onAddMap: () => void
}) {
  const icon =
    group.type === 'world' ? (
      <PublicIcon sx={{ fontSize: 12, color: '#4d9cff', flexShrink: 0 }} />
    ) : group.type === 'dungeon' ? (
      <LayersIcon sx={{ fontSize: 12, color: '#8f9baa', flexShrink: 0 }} />
    ) : (
      <MapIcon sx={{ fontSize: 12, color: '#8f9baa', flexShrink: 0 }} />
    )

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.75,
        mx: 0,
        mt: 0.5,
        borderRadius: '6px',
        cursor: 'pointer',
        background: active ? 'rgba(77,156,255,0.12)' : 'transparent',
        borderLeft: active ? '2px solid #4d9cff' : '2px solid transparent',
        '&:hover': { bgcolor: active ? 'rgba(77,156,255,0.15)' : 'rgba(255,255,255,0.045)' },
      }}
    >
      <Box
        onClick={onToggleExpand}
        sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, color: '#667383' }}
      >
        {expanded ? <KeyboardArrowDownIcon sx={{ fontSize: 14 }} /> : <ChevronRightIcon sx={{ fontSize: 14 }} />}
      </Box>
      {icon}
      <Typography
        onClick={onOpenEditor}
        sx={{
          fontSize: 13,
          fontFamily: 'inherit',
          flex: 1,
          minWidth: 0,
          fontWeight: active ? 600 : 500,
          color: active ? '#d6dee8' : '#8f9baa',
        }}
        noWrap
      >
        {group.name}
      </Typography>
      {group.isOverworld && (
        <Tooltip title="Overworld">
          <PublicIcon sx={{ fontSize: 10, color: '#4d9cff', flexShrink: 0, opacity: 0.85 }} />
        </Tooltip>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, ml: 'auto', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 11, color: '#667383', px: 0.5 }}>{mapCount}</Typography>
        <Tooltip title="Add map to group">
          <IconButton
            size="small"
            sx={{
              p: 0.25,
              borderRadius: 1,
              color: '#667383',
              '&:hover': { color: '#d6dee8', background: 'rgba(255,255,255,0.06)' },
            }}
            onClick={(e) => { e.stopPropagation(); onAddMap() }}
          >
            <AddIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

function UngroupedHeader({
  count,
  expanded,
  onToggle,
}: {
  count: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.75,
        mt: 0.5,
        borderRadius: '6px',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.045)' },
        borderLeft: '2px solid transparent',
      }}
    >
      {expanded ? (
        <KeyboardArrowDownIcon sx={{ fontSize: 14, color: '#667383', flexShrink: 0 }} />
      ) : (
        <ChevronRightIcon sx={{ fontSize: 14, color: '#667383', flexShrink: 0 }} />
      )}
      <FolderOpenIcon sx={{ fontSize: 12, color: '#667383', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 0, color: '#8f9baa' }} noWrap>
        Ungrouped
      </Typography>
      <Typography sx={{ fontSize: 11, color: '#667383', px: 0.5 }}>{count}</Typography>
    </Box>
  )
}

function MapTreeItem({
  map,
  selected,
  indent,
  onClick,
}: {
  map: GameMap
  selected: boolean
  indent: number
  onClick: () => void
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        pl: indent,
        py: 0.75,
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: 13,
        color: selected ? '#d6dee8' : '#8f9baa',
        background: selected ? 'rgba(77,156,255,0.12)' : 'transparent',
        borderLeft: selected ? '2px solid #4d9cff' : '2px solid transparent',
        fontWeight: selected ? 600 : 400,
        '&:hover': {
          bgcolor: selected ? 'rgba(77,156,255,0.15)' : 'rgba(255,255,255,0.045)',
          color: '#d6dee8',
        },
      }}
    >
      <MapIcon sx={{ fontSize: 12, opacity: 0.6, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 13, fontFamily: 'inherit', flex: 1, minWidth: 0 }} noWrap>
        {map.name}
      </Typography>
    </Box>
  )
}
