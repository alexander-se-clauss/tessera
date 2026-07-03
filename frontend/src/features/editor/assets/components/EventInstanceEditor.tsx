import { Box, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { MapEvent } from '../../model/types'
import { GAMEPLAY_ITEM_OPTIONS, itemHasAmount } from './gameplayItems'

type EventInteractionKind = 'none' | 'item' | 'trigger'

type EventInstanceEditorProps = {
  event: MapEvent
  onUpdate: (event: MapEvent, properties: Record<string, unknown>, objectTypeId?: string | null) => Promise<void>
}

export function EventInstanceEditor({ event, onUpdate }: EventInstanceEditorProps) {
  const initial = useMemo(() => normalizeProperties(event.properties), [event.properties])
  const [draft, setDraft] = useState(initial)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDraft(initial)
  }, [initial])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const interaction = draft.interaction
  const interactionKind: EventInteractionKind = interaction?.type ?? 'none'
  const itemType = String(interaction?.itemType ?? 'small_key')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box>
        <Typography sx={{ fontSize: 14, fontWeight: 650, color: '#d6dee8' }}>{event.name}</Typography>
        <Typography sx={{ fontSize: 11, color: '#667383' }}>col {event.x}, row {event.y}</Typography>
      </Box>

      <FormControl size="small" fullWidth>
        <InputLabel>Interaction</InputLabel>
        <Select label="Interaction" value={interactionKind} onChange={(event) => setInteractionKind(event.target.value as EventInteractionKind)}>
          <MenuItem value="none">None</MenuItem>
          <MenuItem value="item">Item</MenuItem>
          <MenuItem value="trigger">Trigger</MenuItem>
        </Select>
      </FormControl>

      {interactionKind === 'item' ? (
        <>
          <FormControl size="small" fullWidth>
            <InputLabel>Required item</InputLabel>
            <Select label="Required item" value={itemType} onChange={(event) => updateInteraction({ itemType: event.target.value })}>
              {GAMEPLAY_ITEM_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {itemHasAmount(itemType) ? (
            <TextField
              size="small"
              type="number"
              label={itemType === 'rupee' ? 'Amount' : 'Count'}
              value={Number(interaction?.amount ?? 1)}
              onChange={(event) => updateInteraction({ amount: Math.max(1, Number(event.target.value) || 1) })}
            />
          ) : null}
          {itemType === 'equipment' || itemType === 'custom' ? (
            <TextField size="small" label="Item ID" value={String(interaction?.itemId ?? '')} onChange={(event) => updateInteraction({ itemId: event.target.value })} />
          ) : null}
          <FormControlLabel
            control={<Switch size="small" checked={interaction?.consume !== false} onChange={(event) => updateInteraction({ consume: event.target.checked })} />}
            label="Consume item"
            sx={{ '& .MuiFormControlLabel-label': { fontSize: 12, color: '#8f9baa' } }}
          />
          <TextField size="small" label="Fire trigger ID" value={String(interaction?.triggerId ?? '')} onChange={(event) => updateInteraction({ triggerId: event.target.value })} />
        </>
      ) : null}

      {interactionKind === 'trigger' ? (
        <TextField size="small" label="Fire trigger ID" value={String(interaction?.triggerId ?? '')} onChange={(event) => updateInteraction({ triggerId: event.target.value })} />
      ) : null}
    </Box>
  )

  function setInteractionKind(kind: EventInteractionKind) {
    const next = {
      ...draft,
      interaction: kind === 'none'
        ? null
        : {
            type: kind,
            ...(kind === 'item' ? { itemType: 'small_key', amount: 1, consume: true } : {}),
          },
    }
    updateProperties(next)
  }

  function updateInteraction(updates: Record<string, unknown>) {
    if (!draft.interaction) return
    updateProperties({ ...draft, interaction: { ...draft.interaction, ...updates } })
  }

  function updateProperties(next: EventPropertiesDraft) {
    setDraft(next)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void onUpdate(event, serializeProperties(next), event.objectTypeId)
    }, 500)
  }
}

type EventPropertiesDraft = Record<string, unknown> & {
  interaction: null | (Record<string, unknown> & { type: EventInteractionKind })
}

function normalizeProperties(properties: Record<string, unknown>): EventPropertiesDraft {
  const interaction = properties.interaction && typeof properties.interaction === 'object'
    ? properties.interaction as EventPropertiesDraft['interaction']
    : null
  return { ...properties, interaction }
}

function serializeProperties(draft: EventPropertiesDraft): Record<string, unknown> {
  if (!draft.interaction) {
    const { interaction: _interaction, ...rest } = draft
    return rest
  }
  return draft
}
