import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import type { ObjectStateDraftDef, ObjectStateTransitionDraft, ObjectTypeDraft } from './types'

type ObjectsStepProps = {
  imageUrl: string
  tileWidth: number
  tileHeight: number
  imageNaturalWidth: number
  drafts: ObjectTypeDraft[]
  onDraftsChange: React.Dispatch<React.SetStateAction<ObjectTypeDraft[]>>
  onDeletedServerIdsChange: React.Dispatch<React.SetStateAction<string[]>>
}

const CATEGORY_COLORS: Record<ObjectTypeDraft['category'], string> = {
  item: '#4caf50',
  decoration: '#2196f3',
  hazard: '#f44336',
  interactive: '#ff9800',
}

function drawTilePreview(
  canvas: HTMLCanvasElement,
  imageUrl: string,
  tileIndex: number,
  tileWidth: number,
  tileHeight: number,
  columns: number,
) {
  if (!imageUrl || columns <= 0) return
  const col = tileIndex % columns
  const row = Math.floor(tileIndex / columns)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(img, col * tileWidth, row * tileHeight, tileWidth, tileHeight, 0, 0, canvas.width, canvas.height)
  }
  img.src = imageUrl
}

const sectionHeadSx = {
  fontSize: 11,
  fontWeight: 650,
  color: 'rgba(220,230,245,0.42)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
} as const

const addBtnSx = {
  fontSize: 12,
  fontWeight: 500,
  color: '#5d9eff',
  bgcolor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  p: 0,
  '&:hover': { color: '#79b8ff' },
} as const

const removeBtnSx = {
  width: 20,
  height: 20,
  fontSize: 14,
  lineHeight: '20px',
  textAlign: 'center',
  bgcolor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'rgba(220,230,245,0.35)',
  borderRadius: '4px',
  flexShrink: 0,
  '&:hover': { color: '#ff7b72', bgcolor: 'rgba(255,123,114,0.1)' },
} as const

function CollisionMiniToggle({ value, onChange }: { value: 'solid' | 'passable'; onChange: (v: 'solid' | 'passable') => void }) {
  return (
    <Box sx={{ display: 'flex', bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '5px', p: '2px', gap: '2px', flexShrink: 0 }}>
      {(['solid', 'passable'] as const).map((option) => {
        const active = value === option
        return (
          <Box key={option} component="button" onClick={() => onChange(option)} sx={{ px: 0.75, py: 0.35, borderRadius: '3px', fontSize: 11, fontWeight: 500, cursor: 'pointer', border: 'none', userSelect: 'none', color: active ? '#d6dee8' : '#667383', bgcolor: active ? '#1d2b3a' : 'transparent' }}>
            {option === 'solid' ? 'S' : 'P'}
          </Box>
        )
      })}
    </Box>
  )
}

function TileCanvas({
  imageUrl,
  tileIndex,
  tileWidth,
  tileHeight,
  columns,
  size = 24,
}: {
  imageUrl: string
  tileIndex: number
  tileWidth: number
  tileHeight: number
  columns: number
  size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (canvasRef.current) {
      drawTilePreview(canvasRef.current, imageUrl, tileIndex, tileWidth, tileHeight, columns)
    }
  }, [imageUrl, tileIndex, tileWidth, tileHeight, columns])
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ imageRendering: 'pixelated', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, flexShrink: 0 }}
    />
  )
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

export function ObjectsStep({
  imageUrl,
  tileWidth,
  tileHeight,
  imageNaturalWidth,
  drafts,
  onDraftsChange,
}: ObjectsStepProps) {
  const columns = tileWidth > 0 ? Math.floor(imageNaturalWidth / tileWidth) : 1
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedDraft = drafts.find((d) => d.id === selectedId) ?? null
  const updateSelectedDraft = (updates: Partial<ObjectTypeDraft>) => {
    onDraftsChange((prev) => prev.map((draft) => draft.id === selectedId ? { ...draft, ...updates } : draft))
  }
  const updateSelectedConfig = (configUpdates: Partial<ObjectTypeDraft['config']>) => {
    onDraftsChange((prev) => prev.map((draft) => draft.id === selectedId ? { ...draft, config: { ...draft.config, ...configUpdates } } : draft))
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', gap: 2, overflow: 'hidden' }}>
      {/* Left panel: object type list */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 650,
              color: 'rgba(220,230,245,0.42)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Object Types
          </Typography>
          <Chip
            label={drafts.length}
            size="small"
            sx={{ height: 18, fontSize: 10, bgcolor: 'rgba(93,158,255,0.15)', color: 'rgba(220,230,245,0.7)' }}
          />
        </Box>

        {drafts.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: '#8b949e', lineHeight: 1.5, pt: 1 }}>
            No object types defined yet. Set a group&apos;s type to &quot;Object&quot; in the Organize step.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {drafts.map((draft) => {
              const isSelected = draft.id === selectedId
              return (
                <Box
                  key={draft.id}
                  onClick={() => setSelectedId(draft.id)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 1,
                    borderRadius: '12px',
                    border: isSelected
                      ? '1px solid rgba(93,158,255,0.38)'
                      : '1px solid rgba(255,255,255,0.06)',
                    background: isSelected
                      ? 'linear-gradient(90deg, rgba(93,158,255,0.18), rgba(93,158,255,0.07))'
                      : 'rgba(255,255,255,0.025)',
                    cursor: 'pointer',
                  }}
                >
                  <TileCanvas
                    imageUrl={imageUrl}
                    tileIndex={draft.config.visual.tileIndex}
                    tileWidth={tileWidth}
                    tileHeight={tileHeight}
                    columns={columns}
                    size={24}
                  />
                  <Typography
                    sx={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      color: isSelected ? '#e6edf3' : '#8b949e',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {draft.name}
                  </Typography>
                  <Chip
                    label={draft.category}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: 10,
                      textTransform: 'capitalize',
                      bgcolor: `${CATEGORY_COLORS[draft.category]}22`,
                      color: CATEGORY_COLORS[draft.category],
                    }}
                  />
                </Box>
              )
            })}
          </Box>
        )}
      </Box>

      {/* Right panel: properties editor */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {selectedDraft === null ? (
          <Box
            sx={{
              height: '100%',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Typography sx={{ fontSize: 13, color: '#8b949e' }}>
              Select an object type to edit
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, maxWidth: 360 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TileCanvas
                imageUrl={imageUrl}
                tileIndex={selectedDraft.config.visual.tileIndex}
                tileWidth={tileWidth}
                tileHeight={tileHeight}
                columns={columns}
                size={36}
              />
              <Typography sx={{ fontSize: 16, fontWeight: 600, color: '#e6edf3' }}>
                {selectedDraft.name}
              </Typography>
            </Box>

            <TextField
              label="Name"
              variant="standard"
              size="small"
              value={selectedDraft.name}
              onChange={(event) => updateSelectedDraft({ name: event.target.value })}
            />

            <FormControl variant="standard" size="small" fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedDraft.category}
                label="Category"
                onChange={(event) => {
                  const newCategory = event.target.value as ObjectTypeDraft['category']
                  onDraftsChange((prev) =>
                    prev.map((d) => (d.id === selectedId ? { ...d, category: newCategory } : d)),
                  )
                }}
                sx={inspectorSelectSx}
              >
                <MenuItem value="item">Item</MenuItem>
                <MenuItem value="decoration">Decoration</MenuItem>
                <MenuItem value="hazard">Hazard</MenuItem>
                <MenuItem value="interactive">Interactive</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
              <TextField
                label="W"
                variant="standard"
                size="small"
                type="number"
                value={selectedDraft.spanX}
                onChange={(event) => {
                  const spanX = Math.max(1, Number(event.target.value) || 1)
                  updateSelectedDraft({ spanX, config: { ...selectedDraft.config, visual: { ...selectedDraft.config.visual, spanX } } })
                }}
              />
              <TextField
                label="H"
                variant="standard"
                size="small"
                type="number"
                value={selectedDraft.spanY}
                onChange={(event) => {
                  const spanY = Math.max(1, Number(event.target.value) || 1)
                  updateSelectedDraft({ spanY, config: { ...selectedDraft.config, visual: { ...selectedDraft.config.visual, spanY } } })
                }}
              />
            </Box>

            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedDraft.config.defaultSolid}
                  onChange={(event) => updateSelectedConfig({ defaultSolid: event.target.checked })}
                  size="small"
                />
              }
              label="Solid by default"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 13, color: 'rgba(220,230,245,0.72)' } }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={selectedDraft.config.isStateful ?? false}
                  onChange={(event) => {
                    const isStateful = event.target.checked
                    updateSelectedConfig({
                      isStateful,
                      stateDefs: isStateful && !(selectedDraft.config.stateDefs?.length)
                        ? [
                            { id: crypto.randomUUID(), name: 'closed', sprite: { tileIndex: selectedDraft.config.visual.tileIndex }, collision: selectedDraft.config.defaultSolid ? 'solid' : 'passable' },
                            { id: crypto.randomUUID(), name: 'open', sprite: { tileIndex: selectedDraft.config.visual.tileIndex }, collision: 'passable' },
                          ]
                        : selectedDraft.config.stateDefs,
                      stateTransitions: isStateful ? (selectedDraft.config.stateTransitions ?? []) : undefined,
                    })
                  }}
                  size="small"
                />
              }
              label="Stateful object"
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 13, color: 'rgba(220,230,245,0.72)' } }}
            />

            {selectedDraft.config.isStateful ? (
              <>
                {/* States */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography sx={sectionHeadSx}>States</Typography>
                    <Box component="button" onClick={() => {
                      const newState: ObjectStateDraftDef = {
                        id: crypto.randomUUID(),
                        name: '',
                        sprite: { tileIndex: selectedDraft.config.visual.tileIndex },
                        collision: selectedDraft.config.defaultSolid ? 'solid' : 'passable',
                      }
                      updateSelectedConfig({ stateDefs: [...(selectedDraft.config.stateDefs ?? []), newState] })
                    }} sx={addBtnSx}>+ Add state</Box>
                  </Box>
                  {(selectedDraft.config.stateDefs ?? []).length < 2 && (
                    <Typography sx={{ fontSize: 12, color: '#e8a832' }}>At least 2 states required.</Typography>
                  )}
                  {(selectedDraft.config.stateDefs ?? []).map((state, idx) => (
                    <Box key={state.id} sx={{ display: 'flex', gap: 0.75, alignItems: 'center', p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Box sx={{ width: 18, height: 18, borderRadius: '4px', bgcolor: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#5d9eff', flexShrink: 0 }}>
                        {idx + 1}
                      </Box>
                      <TileCanvas imageUrl={imageUrl} tileIndex={state.sprite.tileIndex} tileWidth={tileWidth} tileHeight={tileHeight} columns={columns} size={22} />
                      <TextField variant="standard" size="small" placeholder="Name" value={state.name}
                        onChange={(e) => updateSelectedConfig({ stateDefs: (selectedDraft.config.stateDefs ?? []).map((s) => s.id === state.id ? { ...s, name: e.target.value } : s) })}
                        sx={{ flex: 1, minWidth: 50, '& input': { fontSize: 13, py: 0 } }}
                      />
                      <TextField variant="standard" size="small" type="number" label="Tile #" value={state.sprite.tileIndex}
                        onChange={(e) => updateSelectedConfig({ stateDefs: (selectedDraft.config.stateDefs ?? []).map((s) => s.id === state.id ? { ...s, sprite: { tileIndex: Math.max(0, Number(e.target.value) || 0) } } : s) })}
                        sx={{ width: 58, '& input': { fontSize: 13, py: 0 } }}
                      />
                      <CollisionMiniToggle value={state.collision}
                        onChange={(col) => updateSelectedConfig({ stateDefs: (selectedDraft.config.stateDefs ?? []).map((s) => s.id === state.id ? { ...s, collision: col } : s) })}
                      />
                      <Box component="button" onClick={() => updateSelectedConfig({ stateDefs: (selectedDraft.config.stateDefs ?? []).filter((s) => s.id !== state.id) })} sx={removeBtnSx}>×</Box>
                    </Box>
                  ))}
                </Box>

                {/* Transitions */}
                {(selectedDraft.config.stateDefs ?? []).length >= 2 && (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={sectionHeadSx}>Transitions</Typography>
                      <Box component="button" onClick={() => {
                        const defs = selectedDraft.config.stateDefs ?? []
                        updateSelectedConfig({ stateTransitions: [...(selectedDraft.config.stateTransitions ?? []), { id: crypto.randomUUID(), fromStateId: defs[0].id, toStateId: defs[1].id, condition: 'on_interact' as const }] })
                      }} sx={addBtnSx}>+ Add</Box>
                    </Box>
                    {(selectedDraft.config.stateTransitions ?? []).length === 0 && (
                      <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.3)' }}>No transitions defined.</Typography>
                    )}
                    {(selectedDraft.config.stateTransitions ?? []).map((tr) => {
                      const defs = selectedDraft.config.stateDefs ?? []
                      const stateName = (id: string) => defs.find((s) => s.id === id)?.name || id.slice(0, 6)
                      return (
                        <Box key={tr.id} sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-end', p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', flexWrap: 'wrap' }}>
                          <FormControl variant="standard" size="small" sx={{ minWidth: 70, flex: 1 }}>
                            <InputLabel sx={{ fontSize: 12 }}>From</InputLabel>
                            <Select value={tr.fromStateId} sx={inspectorSelectSx}
                              onChange={(e) => updateSelectedConfig({ stateTransitions: (selectedDraft.config.stateTransitions ?? []).map((t) => t.id === tr.id ? { ...t, fromStateId: e.target.value } : t) })}
                            >
                              {defs.map((s) => <MenuItem key={s.id} value={s.id}>{s.name || stateName(s.id)}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <Typography sx={{ fontSize: 11, color: 'rgba(220,230,245,0.3)', pb: 0.5, flexShrink: 0 }}>→</Typography>
                          <FormControl variant="standard" size="small" sx={{ minWidth: 70, flex: 1 }}>
                            <InputLabel sx={{ fontSize: 12 }}>To</InputLabel>
                            <Select value={tr.toStateId} sx={inspectorSelectSx}
                              onChange={(e) => updateSelectedConfig({ stateTransitions: (selectedDraft.config.stateTransitions ?? []).map((t) => t.id === tr.id ? { ...t, toStateId: e.target.value } : t) })}
                            >
                              {defs.filter((s) => s.id !== tr.fromStateId).map((s) => <MenuItem key={s.id} value={s.id}>{s.name || stateName(s.id)}</MenuItem>)}
                            </Select>
                          </FormControl>
                          <FormControl variant="standard" size="small" sx={{ minWidth: 90 }}>
                            <InputLabel sx={{ fontSize: 12 }}>Condition</InputLabel>
                            <Select value={tr.condition} sx={inspectorSelectSx}
                              onChange={(e) => updateSelectedConfig({ stateTransitions: (selectedDraft.config.stateTransitions ?? []).map((t) => t.id === tr.id ? { ...t, condition: e.target.value as ObjectStateTransitionDraft['condition'] } : t) })}
                            >
                              <MenuItem value="on_interact">On interact</MenuItem>
                              <MenuItem value="on_touched">On touched</MenuItem>
                              <MenuItem value="on_pushed">On pushed</MenuItem>
                              <MenuItem value="on_trigger">On trigger</MenuItem>
                            </Select>
                          </FormControl>
                          <Box component="button" onClick={() => updateSelectedConfig({ stateTransitions: (selectedDraft.config.stateTransitions ?? []).filter((t) => t.id !== tr.id) })} sx={{ ...removeBtnSx, mb: 0.5 }}>×</Box>
                        </Box>
                      )
                    })}
                  </Box>
                )}
              </>
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  )
}
