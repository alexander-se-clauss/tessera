import { Box, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  DoorPersistence,
  DoorSpriteRef,
  DoorStates,
  DoorTrigger,
  MapObject,
  MovementDirection,
  MovementPattern,
  ObjectInstanceProperties,
  ObjectInteraction,
  ObjectStateDef,
  ObjectType,
  PushDirections,
  Tileset,
  TriggerCondition,
} from '../../model/types'
import { ObjectTypeThumbnail } from '../../components/ObjectTypeThumbnail'
import { GAMEPLAY_ITEM_OPTIONS, itemHasAmount } from './gameplayItems'

type ObjectInstanceEditorProps = {
  object: MapObject | null
  objectType: ObjectType | null
  tilesets: Tileset[]
  mapObjects?: MapObject[]
  hideHeader?: boolean
  onUpdate: (objectId: string, updates: Partial<MapObject>) => void
}

type InteractionKind = 'none' | 'collect' | 'talk' | 'toggle_state' | 'door'
type MovementKind = 'fixed' | MovementPattern

const ctrlSx = {
  '& .MuiInputBase-root': { height: 40 },
  '& .MuiInputBase-input': { py: 0 },
}

export function ObjectInstanceEditor({ object, objectType, tilesets, mapObjects = [], hideHeader = false, onUpdate }: ObjectInstanceEditorProps) {
  const initial = useMemo(
    () => object && objectType ? normalizeProperties(object, objectType) : null,
    [object, objectType],
  )
  const [draft, setDraft] = useState<ObjectInstanceProperties | null>(initial)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  if (!object || !objectType || !draft) {
    return <DisabledShell />
  }

  const states = objectType.config.states ?? []
  const solidValue = draft.solidOverride ?? objectType.config.defaultSolid
  const movementKind: MovementKind = draft.movement?.pattern ?? 'fixed'
  const interactionKind: InteractionKind = draft.interaction?.type ?? 'none'
  const objectTileset = tilesets.find((tileset) => tileset.id === objectType.tilesetId) ?? null
  const doorStates = normalizeDoorStates(draft, objectType)
  const doorTrigger = normalizeDoorTrigger(draft.trigger)
  const doorPersistence = draft.persistence ?? 'one_shot'
  const tileOptions = objectTileset ? tileIndicesForTileset(objectTileset) : [objectType.config.visual.tileIndex]

  const isStateful = Boolean(objectType.config.isStateful)
  const stateDefs: ObjectStateDef[] = objectType.config.stateDefs ?? []
  const isPushable = movementKind === 'push_once' || movementKind === 'push_infinite'
  const pushDirections: PushDirections = draft.pushDirections ?? { up: true, down: true, left: true, right: true }
  const emitterEnabled = Boolean(draft.emitter)
  const listenerEnabled = Boolean(draft.listener)
  const mapEmitterTriggerIds = mapObjects
    .filter(o => o.id !== object.id && o.properties.emitter?.triggerId)
    .map(o => o.properties.emitter!.triggerId)
  const listenerTriggerBroken = listenerEnabled && Boolean(draft.listener?.triggerId) &&
    !mapEmitterTriggerIds.includes(draft.listener!.triggerId)
  const availableConditions: Array<{ value: TriggerCondition; label: string }> = [
    ...(isPushable ? [{ value: 'on_pushed' as const, label: 'On pushed' }] : []),
    { value: 'on_touched' as const, label: 'On touched' },
    { value: 'on_interact' as const, label: 'On interact' },
    { value: 'on_state_change' as const, label: 'On state change' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {!hideHeader && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <ObjectTypeThumbnail objectType={objectType} tilesets={tilesets} size={46} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 500, color: '#d6dee8', lineHeight: 1.3 }} noWrap>
              {objectType.name}
            </Typography>
            <Typography sx={{ fontSize: 13, color: '#667383', mt: 0.25 }}>
              col {object.x}, row {object.y}
            </Typography>
          </Box>
        </Box>
      )}

      {states.length > 0 ? (
        <FormControl size="small" fullWidth sx={ctrlSx}>
          <InputLabel>Visual state</InputLabel>
          <Select
            label="Visual state"
            value={draft.currentState ?? ''}
            onChange={(event) => updateProperties({ ...draft, currentState: event.target.value || null })}
          >
            {states.map((state) => <MenuItem key={state.name} value={state.name}>{state.name}</MenuItem>)}
          </Select>
        </FormControl>
      ) : null}

      {/* Collision */}
      <Box>
        <Typography sx={sectionLabelSx}>Collision</Typography>
        <CollisionToggle
          value={solidValue ? 'solid' : 'passable'}
          onChange={(option) => updateProperties({ ...draft, solidOverride: option === 'solid' })}
        />
        {(draft.solidOverride === null || draft.solidOverride === undefined) && (
          <Typography sx={{ mt: 0.5, fontSize: 11, color: '#667383' }}>Default from tile</Typography>
        )}
      </Box>

      {/* State — stateful objects only */}
      {isStateful && stateDefs.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography sx={sectionLabelSx}>State</Typography>
          <FormControl size="small" fullWidth sx={ctrlSx}>
            <InputLabel>Initial state</InputLabel>
            <Select
              label="Initial state"
              value={draft.initialStateId ?? stateDefs[0]?.id ?? ''}
              onChange={(event) => updateProperties({ ...draft, initialStateId: event.target.value })}
            >
              {stateDefs.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth sx={ctrlSx}>
            <InputLabel>Reset behavior</InputLabel>
            <Select
              label="Reset behavior"
              value={draft.resetBehavior ?? 'never'}
              onChange={(event) => updateProperties({ ...draft, resetBehavior: event.target.value as ObjectInstanceProperties['resetBehavior'] })}
            >
              <MenuItem value="never">Never</MenuItem>
              <MenuItem value="on_room_exit">On room exit</MenuItem>
              <MenuItem value="on_respawn">On respawn</MenuItem>
            </Select>
          </FormControl>
        </Box>
      ) : null}

      {/* Movement */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={sectionLabelSx}>Movement</Typography>
        <FormControl size="small" fullWidth sx={ctrlSx}>
          <InputLabel>Pattern</InputLabel>
          <Select label="Pattern" value={movementKind} onChange={(event) => setMovementKind(event.target.value as MovementKind)}>
            <MenuItem value="fixed">Fixed</MenuItem>
            <MenuItem value="push_once">Push once</MenuItem>
            <MenuItem value="push_infinite">Push infinite</MenuItem>
            <MenuItem value="patrol">Patrol</MenuItem>
            <MenuItem value="bounce">Bounce</MenuItem>
          </Select>
        </FormControl>
        {(draft.movement?.pattern === 'patrol' || draft.movement?.pattern === 'bounce') ? (
          <>
            <FormControl size="small" fullWidth sx={ctrlSx}>
              <InputLabel>Direction</InputLabel>
              <Select
                label="Direction"
                value={draft.movement.direction ?? 'any'}
                onChange={(event) => updateMovement({ direction: event.target.value as MovementDirection })}
              >
                <MenuItem value="horizontal">Horizontal</MenuItem>
                <MenuItem value="vertical">Vertical</MenuItem>
                <MenuItem value="any">Any</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" type="number" label="Speed" sx={ctrlSx} value={draft.movement.speed ?? 2} onChange={(event) => updateMovement({ speed: Number(event.target.value) })} />
            {draft.movement.pattern === 'patrol' ? (
              <TextField size="small" type="number" label="Distance" sx={ctrlSx} value={draft.movement.patrolDistance ?? 3} onChange={(event) => updateMovement({ patrolDistance: Number(event.target.value) })} />
            ) : null}
          </>
        ) : null}
        {isPushable ? (
          <Box>
            <Typography sx={sectionLabelSx}>Push direction</Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {([
                { key: 'left' as const, icon: <ArrowBackIcon sx={{ fontSize: 14 }} /> },
                { key: 'up' as const, icon: <ArrowUpwardIcon sx={{ fontSize: 14 }} /> },
                { key: 'down' as const, icon: <ArrowDownwardIcon sx={{ fontSize: 14 }} /> },
                { key: 'right' as const, icon: <ArrowForwardIcon sx={{ fontSize: 14 }} /> },
              ]).map(({ key, icon }) => {
                const active = pushDirections[key]
                return (
                  <Box
                    key={key}
                    component="button"
                    onClick={() => updateProperties({ ...draft, pushDirections: { ...pushDirections, [key]: !active } })}
                    sx={{
                      flex: 1,
                      height: 36,
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: active ? 'rgba(55,138,221,0.45)' : 'rgba(255,255,255,0.09)',
                      bgcolor: active ? 'rgba(55,138,221,0.15)' : 'rgba(0,0,0,0.2)',
                      color: active ? '#378ADD' : '#667383',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 120ms ease, color 120ms ease',
                      '&:hover': {
                        bgcolor: active ? 'rgba(55,138,221,0.22)' : 'rgba(255,255,255,0.06)',
                        borderColor: active ? 'rgba(55,138,221,0.6)' : 'rgba(255,255,255,0.14)',
                      },
                    }}
                  >
                    {icon}
                  </Box>
                )
              })}
            </Box>
          </Box>
        ) : null}
      </Box>

      {/* Emits trigger */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
          <Typography sx={sectionLabelSx}>Emits trigger</Typography>
          <Switch
            size="small"
            checked={emitterEnabled}
            onChange={(event) => {
              if (event.target.checked) {
                const nextId = `trigger_${mapObjects.filter(o => o.properties.emitter).length + 1}`
                updateProperties({ ...draft, emitter: { triggerId: nextId, condition: availableConditions[0]?.value ?? 'on_touched' } })
              } else {
                const { emitter: _e, ...rest } = draft as Record<string, unknown>
                updateProperties(rest as ObjectInstanceProperties)
              }
            }}
          />
        </Box>
        {emitterEnabled && draft.emitter ? (
          <>
            <TextField
              size="small"
              label="Trigger ID"
              sx={{
                ...ctrlSx,
                ...(mapObjects.some(o => o.id !== object.id && o.properties.emitter?.triggerId === draft.emitter!.triggerId)
                  ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: '#f44336 !important' } }
                  : {}),
              }}
              value={draft.emitter.triggerId}
              helperText={
                mapObjects.some(o => o.id !== object.id && o.properties.emitter?.triggerId === draft.emitter!.triggerId)
                  ? 'Trigger ID already in use on this map'
                  : undefined
              }
              FormHelperTextProps={{ sx: { color: '#f44336', mt: 0.25, mx: 0 } }}
              onChange={(event) => updateProperties({ ...draft, emitter: { ...draft.emitter!, triggerId: event.target.value } })}
            />
            <FormControl size="small" fullWidth sx={ctrlSx}>
              <InputLabel>Condition</InputLabel>
              <Select
                label="Condition"
                value={draft.emitter.condition}
                onChange={(event) => updateProperties({ ...draft, emitter: { ...draft.emitter!, condition: event.target.value as TriggerCondition } })}
              >
                {availableConditions.map(c => (
                  <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        ) : null}
      </Box>

      {/* Listens for trigger — stateful objects only */}
      {isStateful ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
            <Typography sx={sectionLabelSx}>Listens for trigger</Typography>
            <Switch
              size="small"
              checked={listenerEnabled}
              onChange={(event) => {
                if (event.target.checked) {
                  updateProperties({ ...draft, listener: { triggerId: mapEmitterTriggerIds[0] ?? '', targetStateId: stateDefs[0]?.id } })
                } else {
                  const { listener: _l, ...rest } = draft as Record<string, unknown>
                  updateProperties(rest as ObjectInstanceProperties)
                }
              }}
            />
          </Box>
          {listenerEnabled && draft.listener ? (
            <>
              <FormControl
                size="small"
                fullWidth
                sx={{
                  ...ctrlSx,
                  ...(listenerTriggerBroken ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: '#f44336 !important' } } : {}),
                }}
              >
                <InputLabel>Trigger ID</InputLabel>
                <Select
                  label="Trigger ID"
                  value={draft.listener.triggerId}
                  disabled={mapEmitterTriggerIds.length === 0 && !listenerTriggerBroken}
                  onChange={(event) => updateProperties({ ...draft, listener: { ...draft.listener!, triggerId: event.target.value } })}
                >
                  {mapEmitterTriggerIds.length === 0 && !listenerTriggerBroken ? (
                    <MenuItem value="" disabled>No triggers defined on this map</MenuItem>
                  ) : null}
                  {listenerTriggerBroken ? (
                    <MenuItem value={draft.listener.triggerId} sx={{ color: '#f44336' }}>{draft.listener.triggerId}</MenuItem>
                  ) : null}
                  {mapEmitterTriggerIds.map(id => (
                    <MenuItem key={id} value={id}>{id}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {listenerTriggerBroken ? (
                <Typography sx={{ fontSize: 11, color: '#f44336', mt: -0.75 }}>Trigger no longer exists</Typography>
              ) : null}
              <FormControl size="small" fullWidth sx={ctrlSx}>
                <InputLabel>Target state</InputLabel>
                <Select
                  label="Target state"
                  value={draft.listener.targetStateId ?? ''}
                  onChange={(event) => updateProperties({ ...draft, listener: { ...draft.listener!, targetStateId: event.target.value } })}
                >
                  {stateDefs.length === 0 ? <MenuItem value="" disabled>No states defined</MenuItem> : null}
                  {stateDefs.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                </Select>
              </FormControl>
            </>
          ) : null}
        </Box>
      ) : null}

      {/* Interaction */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={sectionLabelSx}>Interaction</Typography>
        <FormControl size="small" fullWidth sx={ctrlSx}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={interactionKind} onChange={(event) => setInteractionKind(event.target.value as InteractionKind)}>
            <MenuItem value="none">None</MenuItem>
            <MenuItem value="collect">Collect</MenuItem>
            <MenuItem value="talk">Talk</MenuItem>
            <MenuItem value="toggle_state">Toggle state</MenuItem>
            {interactionKind === 'door' ? <MenuItem value="door">Door (legacy)</MenuItem> : null}
          </Select>
        </FormControl>
        {draft.interaction?.type === 'toggle_state' && states.length > 0 ? (
          <FormControl size="small" fullWidth sx={ctrlSx}>
            <InputLabel>Transitions to</InputLabel>
            <Select label="Transitions to" value={draft.interaction.targetState ?? ''} onChange={(event) => updateInteraction({ targetState: event.target.value })}>
              {states.map((state) => <MenuItem key={state.name} value={state.name}>{state.name}</MenuItem>)}
            </Select>
          </FormControl>
        ) : null}
        {draft.interaction?.type === 'toggle_state' && states.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: '#8f9baa' }}>This object type has no states defined. Add states in the Object Registry.</Typography>
        ) : null}
        {draft.interaction?.type === 'collect' ? (
          <>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl size="small" sx={{ ...ctrlSx, flex: 1 }}>
                <InputLabel>Loot</InputLabel>
                <Select label="Loot" value={draft.interaction.lootType ?? 'rupee'} onChange={(event) => updateInteraction({ lootType: event.target.value })}>
                  {GAMEPLAY_ITEM_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {itemHasAmount(draft.interaction.lootType ?? 'rupee') ? (
                <TextField
                  size="small"
                  type="number"
                  label="Amount"
                  sx={{ ...ctrlSx, width: 80 }}
                  value={draft.interaction.lootAmount ?? 1}
                  onChange={(event) => updateInteraction({ lootAmount: Math.max(1, Number(event.target.value) || 1) })}
                />
              ) : null}
            </Box>
            {draft.interaction.lootType === 'equipment' || draft.interaction.lootType === 'custom' ? (
              <TextField size="small" label="Item ID" sx={ctrlSx} value={String((draft.interaction as Record<string, unknown>).itemId ?? '')} onChange={(event) => updateInteraction({ itemId: event.target.value } as Partial<NonNullable<ObjectInstanceProperties['interaction']>>)} />
            ) : null}
          </>
        ) : null}
        {draft.interaction?.type === 'door' ? (
          <>
            <DoorSpriteControl
              label="Closed sprite"
              value={doorStates.closed.sprite}
              tileset={objectTileset}
              tileOptions={tileOptions}
              onChange={(sprite) => updateDoorState(sprite)}
            />

            <FormControl size="small" fullWidth sx={ctrlSx}>
              <InputLabel>Trigger</InputLabel>
              <Select label="Trigger" value={doorTrigger.type} onChange={(event) => setDoorTriggerType(event.target.value as DoorTrigger['type'])}>
                <MenuItem value="key">Key</MenuItem>
                <MenuItem value="signal">Signal</MenuItem>
              </Select>
            </FormControl>

            {doorTrigger.type === 'key' ? (
              <>
                <FormControl size="small" fullWidth sx={ctrlSx}>
                  <InputLabel>Required item</InputLabel>
                  <Select label="Required item" value={doorTrigger.requiredItem} onChange={(event) => updateDoorTrigger({ requiredItem: event.target.value })}>
                    {GAMEPLAY_ITEM_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Switch size="small" checked={doorTrigger.consume} onChange={(event) => updateDoorTrigger({ consume: event.target.checked })} />}
                  label="Consume"
                  sx={{
                    minHeight: 40,
                    mx: 0,
                    color: '#8f9baa',
                    '& .MuiFormControlLabel-label': { fontSize: 12 },
                  }}
                />
              </>
            ) : (
              <TextField
                size="small"
                label="Signal"
                sx={ctrlSx}
                value={doorTrigger.signalId}
                disabled
                helperText="Signal triggers coming soon"
                onChange={() => {}}
              />
            )}

            <Box>
              <Typography sx={sectionLabelSx}>Persistence</Typography>
              <PersistenceToggle
                value={doorPersistence}
                disableHeld={doorTrigger.type === 'key'}
                onChange={(persistence) => updateProperties({ ...draft, persistence })}
              />
            </Box>
          </>
        ) : null}
      </Box>
    </Box>
  )

  function updateProperties(next: ObjectInstanceProperties) {
    if (!object) return
    setDraft(next)
    onUpdate(object.id, { properties: next })
  }

  function setMovementKind(kind: MovementKind) {
    if (!draft) return
    updateProperties({
      ...draft,
      movement: kind === 'fixed'
        ? null
        : {
            pattern: kind,
            ...(kind === 'patrol' || kind === 'bounce' ? { direction: 'horizontal' as const, speed: 2 } : {}),
            ...(kind === 'patrol' ? { patrolDistance: 3 } : {}),
          },
    })
  }

  function updateMovement(updates: Partial<NonNullable<ObjectInstanceProperties['movement']>>) {
    if (!draft) return
    updateProperties({ ...draft, movement: draft.movement ? { ...draft.movement, ...updates } : draft.movement })
  }

  function setInteractionKind(kind: InteractionKind) {
    if (!draft) return
    updateProperties({
      ...draft,
      interaction: kind === 'none' ? null : defaultInteraction(kind),
      ...(kind === 'door' ? defaultDoorProperties(draft, objectType!) : {}),
    })
  }

  function updateInteraction(updates: Record<string, unknown>) {
    if (!draft) return
    updateProperties({ ...draft, interaction: draft.interaction ? { ...draft.interaction, ...updates } as ObjectInteraction : draft.interaction })
  }

  function updateDoorState(sprite: DoorSpriteRef) {
    if (!draft) return
    const nextStates = normalizeDoorStates(draft, objectType!)
    updateProperties({
      ...draft,
      states: { closed: { ...nextStates.closed, sprite } },
    })
  }

  function setDoorTriggerType(type: DoorTrigger['type']) {
    if (!draft) return
    updateProperties({
      ...draft,
      trigger: type === 'key'
        ? { type: 'key', requiredItem: 'small_key', consume: true }
        : { type: 'signal', signalId: '' },
      persistence: type === 'key' ? 'one_shot' : draft.persistence ?? 'one_shot',
    })
  }

  function updateDoorTrigger(updates: Record<string, unknown>) {
    if (!draft) return
    updateProperties({ ...draft, trigger: { ...normalizeDoorTrigger(draft.trigger), ...updates } as DoorTrigger })
  }
}

function CollisionToggle({ value, onChange }: { value: 'solid' | 'passable'; onChange: (v: 'solid' | 'passable') => void }) {
  return (
    <Box sx={{ display: 'flex', bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '6px', p: '3px', gap: '3px' }}>
      {(['solid', 'passable'] as const).map((option) => {
        const active = value === option
        return (
          <Box
            key={option}
            component="button"
            onClick={() => onChange(option)}
            sx={{
              flex: 1,
              py: 0.75,
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.4,
              cursor: 'pointer',
              border: 'none',
              outline: 'none',
              userSelect: 'none',
              transition: 'background 120ms ease, color 120ms ease',
              color: active ? '#d6dee8' : '#667383',
              bgcolor: active ? '#1d2b3a' : 'transparent',
              '&:hover': active ? {} : { color: '#9aa6b5', bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            {option === 'solid' ? 'Solid' : 'Passable'}
          </Box>
        )
      })}
    </Box>
  )
}

function PersistenceToggle({
  value,
  disableHeld,
  onChange,
}: {
  value: DoorPersistence
  disableHeld: boolean
  onChange: (value: DoorPersistence) => void
}) {
  return (
    <Box sx={{ display: 'flex', bgcolor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '6px', p: '3px', gap: '3px' }}>
      {(['one_shot', 'held'] as const).map((option) => {
        const active = value === option
        const disabled = option === 'held' && disableHeld
        return (
          <Box
            key={option}
            component="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) onChange(option)
            }}
            sx={{
              flex: 1,
              py: 0.75,
              borderRadius: '4px',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.4,
              cursor: disabled ? 'not-allowed' : 'pointer',
              border: 'none',
              outline: 'none',
              userSelect: 'none',
              color: disabled ? '#4d5866' : active ? '#d6dee8' : '#667383',
              bgcolor: active ? '#1d2b3a' : 'transparent',
              '&:hover': disabled || active ? {} : { color: '#9aa6b5', bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            {option === 'one_shot' ? 'One shot' : 'Held'}
          </Box>
        )
      })}
    </Box>
  )
}

function DoorSpriteControl({
  label,
  value,
  tileset,
  tileOptions,
  onChange,
}: {
  label: string
  value: DoorSpriteRef
  tileset: Tileset | null
  tileOptions: number[]
  onChange: (sprite: DoorSpriteRef) => void
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <DoorSpritePreview sprite={value} tileset={tileset} />
      <FormControl size="small" fullWidth sx={ctrlSx}>
        <InputLabel>{label}</InputLabel>
        <Select
          label={label}
          value={value.tileIndex}
          onChange={(event) => onChange({ tilesetId: tileset?.id ?? value.tilesetId ?? null, tileIndex: Number(event.target.value) })}
        >
          {tileOptions.map((tileIndex) => (
            <MenuItem key={tileIndex} value={tileIndex}>Tile {tileIndex}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

function DoorSpritePreview({ sprite, tileset }: { sprite: DoorSpriteRef; tileset: Tileset | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tile = tileset?.tiles.find((candidate) => candidate.index === sprite.tileIndex)
  const composedColumns = tileset ? Math.max(1, tileset.columns) : 1
  const composedCol = sprite.tileIndex % composedColumns
  const composedRow = Math.floor(sprite.tileIndex / composedColumns)
  const hasComposedTile = Boolean(tileset?.tileMap?.[`${composedCol},${composedRow}`])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !tileset || !hasComposedTile || tile) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, 32, 32)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        image,
        composedCol * tileset.tileWidth,
        composedRow * tileset.tileHeight,
        tileset.tileWidth,
        tileset.tileHeight,
        0,
        0,
        32,
        32,
      )
    }
    image.src = tileset.imageUrl
  }, [composedCol, composedRow, hasComposedTile, tile, tileset])

  return (
    <Box
      sx={{
        width: 40,
        height: 40,
        borderRadius: '6px',
        bgcolor: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {tile ? (
        <Box component="img" src={tile.imageUrl} alt="" sx={{ width: 32, height: 32, display: 'block', imageRendering: 'pixelated' }} />
      ) : hasComposedTile ? (
        <Box component="canvas" ref={canvasRef} width={32} height={32} sx={{ width: 32, height: 32, display: 'block', imageRendering: 'pixelated' }} />
      ) : (
        <Typography sx={{ fontSize: 10, color: '#667383' }}>?</Typography>
      )}
    </Box>
  )
}

function DisabledShell() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.38, pointerEvents: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 500, color: '#d6dee8', lineHeight: 1.3 }}>No selection</Typography>
          <Typography sx={{ fontSize: 13, color: '#667383', mt: 0.25 }}>col --, row --</Typography>
        </Box>
      </Box>
      <Box>
        <Typography sx={sectionLabelSx}>Collision</Typography>
        <CollisionToggle value="passable" onChange={() => {}} />
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={sectionLabelSx}>Movement</Typography>
        <FormControl size="small" fullWidth sx={ctrlSx}>
          <InputLabel>Pattern</InputLabel>
          <Select label="Pattern" value="fixed" onChange={() => {}}>
            <MenuItem value="fixed">Fixed</MenuItem>
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Typography sx={sectionLabelSx}>Interaction</Typography>
        <FormControl size="small" fullWidth sx={ctrlSx}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value="none" onChange={() => {}}>
            <MenuItem value="none">None</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}

function normalizeProperties(object: MapObject, objectType: ObjectType): ObjectInstanceProperties {
  const firstStateId = objectType.config.stateDefs?.[0]?.id
  return {
    objectTypeId: objectType.id,
    currentState: object.properties.currentState ?? (objectType.config.isStateful ? (object.properties.initialStateId ?? firstStateId ?? null) : (objectType.config.defaultState ?? null)),
    visible: object.properties.visible ?? null,
    states: object.properties.states,
    initialState: object.properties.initialState,
    trigger: object.properties.trigger,
    persistence: object.properties.persistence,
    movement: object.properties.movement ?? null,
    interaction: object.properties.interaction ?? null,
    solidOverride: object.properties.solidOverride ?? null,
    pushDirections: object.properties.pushDirections,
    emitter: object.properties.emitter,
    listener: object.properties.listener,
    initialStateId: object.properties.initialStateId ?? firstStateId,
    resetBehavior: object.properties.resetBehavior ?? 'never',
  }
}

function defaultInteraction(kind: Exclude<InteractionKind, 'none'>): ObjectInteraction {
  if (kind === 'collect') return { type: 'collect', lootType: 'rupee', lootAmount: 1 }
  if (kind === 'toggle_state') return { type: 'toggle_state' }
  if (kind === 'trigger') return { type: 'trigger', triggerId: '' }
  if (kind === 'talk') return { type: 'talk' }
  return { type: 'door' }
}

function defaultDoorProperties(draft: ObjectInstanceProperties, objectType: ObjectType): Partial<ObjectInstanceProperties> {
  const states = normalizeDoorStates(draft, objectType)
  const initialState = draft.initialState ?? 'closed'
  return {
    states,
    initialState,
    currentState: draft.currentState === 'open' || draft.currentState === 'closed' ? draft.currentState : initialState,
    trigger: normalizeDoorTrigger(draft.trigger),
    persistence: draft.persistence ?? 'one_shot',
  }
}

function normalizeDoorStates(draft: ObjectInstanceProperties, objectType: ObjectType): DoorStates {
  const fallbackSprite = { tilesetId: objectType.tilesetId, tileIndex: objectType.config.visual.tileIndex }
  return {
    closed: {
      sprite: normalizeSpriteRef(draft.states?.closed.sprite, fallbackSprite),
      collision: 'solid',
    },
  }
}

function normalizeSpriteRef(value: DoorSpriteRef | undefined, fallback: DoorSpriteRef): DoorSpriteRef {
  const tileIndex = value?.tileIndex
  return {
    tilesetId: value?.tilesetId ?? fallback.tilesetId ?? null,
    tileIndex: typeof tileIndex === 'number' && Number.isFinite(tileIndex) ? tileIndex : fallback.tileIndex,
  }
}

function normalizeDoorTrigger(value: DoorTrigger | undefined): DoorTrigger {
  if (value?.type === 'signal') return { type: 'signal', signalId: value.signalId ?? '' }
  return {
    type: 'key',
    requiredItem: value?.type === 'key' ? value.requiredItem || 'small_key' : 'small_key',
    consume: value?.type === 'key' ? value.consume !== false : true,
  }
}

function tileIndicesForTileset(tileset: Tileset): number[] {
  const indices = new Set<number>()
  for (const tile of tileset.tiles) indices.add(tile.index)
  for (const key of Object.keys(tileset.tileMap ?? {})) {
    const [colRaw, rowRaw] = key.split(',')
    const col = Number(colRaw)
    const row = Number(rowRaw)
    if (Number.isFinite(col) && Number.isFinite(row)) indices.add(row * tileset.columns + col)
  }
  return [...indices].sort((a, b) => a - b)
}

const sectionLabelSx = {
  mb: 0.75,
  fontSize: 11,
  fontWeight: 700,
  color: '#9aa6b5',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
} as const
