import { Box, Chip, Typography } from '@mui/material'
import type { TilesetReviewStepProps } from './types'

const CATEGORY_COLORS: Record<string, string> = {
  item: '#4caf50',
  decoration: '#2196f3',
  hazard: '#f44336',
  interactive: '#ff9800',
}

export function TilesetReviewStep({ importSession, assetName, groups, allTiles, objectDrafts }: TilesetReviewStepProps) {
  const assignedTileIds = new Set(groups.flatMap((group) => group.tileRefs.map((ref) => ref.tileId)))
  const unassignedCount = allTiles.filter((tile) => !assignedTileIds.has(tile.id)).length

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '220px minmax(0, 1fr)' }, gap: 0, flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pl: 3, pr: 2.5, py: 2.5, borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
        <Section title="Import summary" />
        <SummaryRow label="Tileset" value={assetName} />
        <SummaryRow label="Source tiles" value={String(importSession.tiles.length)} />
        <SummaryRow label="Groups" value={String(groups.length)} />
        <SummaryRow label="Object types" value={String(objectDrafts.length)} />
        <SummaryRow label="Assigned" value={String(importSession.tiles.length - unassignedCount)} />
        <SummaryRow label="Unassigned" value={String(unassignedCount)} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pl: 2.5, pr: 2, py: 2, overflowY: 'auto' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Section title="Groups" />
          {groups.map((group) => {
            const overrides = Object.keys((group.metadata.tileOverrides ?? {}) as Record<string, unknown>).length
            return (
              <Box
                key={group.id}
                sx={{
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  px: 1.5,
                  py: 1.25,
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }} noWrap>{group.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: '#8b949e', mt: 0.25 }}>
                    {String(group.metadata.tileType ?? 'floor')} · {String(group.metadata.solid ? 'solid default' : 'non-solid default')}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 12, color: '#8b949e' }}>{group.tileRefs.length} tiles</Typography>
                <Typography sx={{ fontSize: 12, color: '#8b949e' }}>{overrides} overrides</Typography>
              </Box>
            )
          })}
        </Box>

        {objectDrafts.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Section title="Object types" />
            {objectDrafts.map((draft) => (
              <Box
                key={draft.id}
                sx={{
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  px: 1.5,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Typography sx={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#e6edf3', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {draft.name}
                </Typography>
                <Chip
                  label={draft.category}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    textTransform: 'capitalize',
                    bgcolor: `${CATEGORY_COLORS[draft.category] ?? '#888'}22`,
                    color: CATEGORY_COLORS[draft.category] ?? '#888',
                  }}
                />
                <Typography sx={{ fontSize: 12, color: '#8b949e' }}>{draft.spanX}×{draft.spanY}</Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
    </Box>
  )
}

function Section({ title }: { title: string }) {
  return (
    <Typography sx={{ fontSize: 11, fontWeight: 650, color: 'rgba(220,230,245,0.42)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
      {title}
    </Typography>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography sx={{ fontSize: 13, color: '#8b949e' }}>{label}</Typography>
      <Typography sx={{ fontSize: 13, color: '#e6edf3' }}>{value}</Typography>
    </Box>
  )
}
