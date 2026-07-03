import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Box, IconButton, Tooltip, Typography } from '@mui/material'
import { editorTokens as tok } from '../../../app/theme'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import BoltIcon from '@mui/icons-material/Bolt'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import AdsClickIcon from '@mui/icons-material/AdsClick'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import CodeIcon from '@mui/icons-material/Code'
import type { EditorTab, GameMap, MapEvent, MapObject, ObjectType, SelectedCell, Tileset } from '../model'
import { getCellDisplay } from '../model/utils'
import { EventInstanceEditor } from '../assets/components/EventInstanceEditor'
import { ObjectInstanceEditor } from '../assets/components/ObjectInstanceEditor'
import { ObjectTypeThumbnail } from './ObjectTypeThumbnail'

const INSPECTOR_LABEL_SIZE = 11
const INSPECTOR_TEXT_SIZE = 13
const INSPECTOR_ROW_Y = 0.75

const TILE_TYPE_LABELS: Record<string, string> = {
  floor: 'Floor',
  wall: 'Wall',
  water: 'Water',
  object: 'Object',
}

type InspectorPanelProps = {
  activeMap: GameMap | null
  tilesets: Tileset[]
  activeTileset: Tileset | null
  activeTab: EditorTab
  selectedCell: SelectedCell | null
  selectedTileIndex: number | null
  selectedEvent: MapEvent | null
  selectedObject: MapObject | null
  events: MapEvent[]
  objectTypes: ObjectType[]
  onUpdateEvent: (event: MapEvent, properties: Record<string, unknown>, objectTypeId?: string | null) => Promise<void>
  onDeleteEvent: (event: MapEvent) => Promise<void>
  onUpdateObject: (objectId: string, updates: Partial<MapObject>) => void
}

export function InspectorPanel({
  activeMap,
  activeTab,
  tilesets,
  activeTileset,
  selectedEvent,
  selectedObject,
  selectedCell,
  selectedTileIndex,
  events,
  objectTypes,
  onUpdateEvent,
  onDeleteEvent,
  onUpdateObject,
}: InspectorPanelProps) {
  const display = activeMap && selectedCell ? getCellDisplay(activeMap, selectedCell.x, selectedCell.y, events) : null
  const topTile = display ? (display.foreground ?? display.background ?? display.collision) : null
  const selectedTilesetTile = topTile?.tilesetId
    ? tilesets.find((tileset) => tileset.id === topTile.tilesetId)?.tiles.find((tile) => tile.index === topTile.tileIndex) ?? null
    : null
  const tileMeta = selectedTilesetTile?.metadata ?? null
  const selectedObjectType = selectedObject
    ? objectTypes.find((objectType) => String(objectType.id) === String(selectedObject.objectTypeId)) ?? null
    : null

  const pickerTileInfo = (() => {
    if (activeTab !== 'background' || selectedTileIndex == null || !activeTileset) return null
    const regularTile = activeTileset.tiles.find((t) => t.index === selectedTileIndex) ?? null
    if (regularTile) return { type: 'regular' as const, tile: regularTile, meta: regularTile.metadata }
    if (activeTileset.tileMap && Object.keys(activeTileset.tileMap).length > 0) {
      const col = selectedTileIndex % Math.max(1, activeTileset.columns)
      const row = Math.floor(selectedTileIndex / Math.max(1, activeTileset.columns))
      if (`${col},${row}` in activeTileset.tileMap) {
        return { type: 'composed' as const, col, row, tileset: activeTileset, meta: null as null }
      }
    }
    return null
  })()

  const cellComposedTile = !selectedTilesetTile && !pickerTileInfo && topTile
    ? (() => {
        const tileset = topTile.tilesetId ? tilesets.find((t) => t.id === topTile.tilesetId) ?? null : null
        if (!tileset?.tileMap) return null
        const col = topTile.tileIndex % Math.max(1, tileset.columns)
        const row = Math.floor(topTile.tileIndex / Math.max(1, tileset.columns))
        return `${col},${row}` in tileset.tileMap ? { col, row, tileset } : null
      })()
    : null

  const effectiveTile = pickerTileInfo?.type === 'regular' ? pickerTileInfo.tile : selectedTilesetTile
  const effectiveMeta = pickerTileInfo ? pickerTileInfo.meta : tileMeta
  const layerLabel = pickerTileInfo ? null : (display?.foreground ? 'Foreground' : display?.background ? 'Background' : display?.collision ? 'Collision' : null)

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
      <Box
        sx={{
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          pt: 0.5,
          pb: 1.25,
          '& .MuiInputBase-root': {
            borderRadius: '8px',
            background: '#111923',
            color: '#d6dee8',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.12)',
          },
          '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.18)',
          },
          '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(77,156,255,0.65) !important',
          },
          '& .MuiInputLabel-root': {
            color: '#8f9baa',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: '#4d9cff',
          },
        }}
      >
        {activeTab !== 'objects' && activeTab !== 'events' && (
          <InspectorAccordion label="Tile Properties" defaultExpanded>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <TilePreviewBox>
                {pickerTileInfo?.type === 'composed' ? (
                  <ComposedTileCanvas tileset={pickerTileInfo.tileset} col={pickerTileInfo.col} row={pickerTileInfo.row} size={72} />
                ) : effectiveTile ? (
                  <Box component="img" src={effectiveTile.imageUrl} alt={`tile-${topTile?.tileIndex ?? selectedTileIndex}`} sx={{ width: 72, height: 72, display: 'block', imageRendering: 'pixelated' }} />
                ) : cellComposedTile ? (
                  <ComposedTileCanvas tileset={cellComposedTile.tileset} col={cellComposedTile.col} row={cellComposedTile.row} size={72} />
                ) : (
                  <Typography sx={{ fontSize: INSPECTOR_TEXT_SIZE, color: '#8f9baa' }}>No tile selected</Typography>
                )}
              </TilePreviewBox>
              <PropRow label="Type" value={effectiveMeta ? (TILE_TYPE_LABELS[String(effectiveMeta.tileType)] ?? String(effectiveMeta.tileType)) : '—'} valueColor={effectiveMeta ? '#EF9F27' : undefined} />
              <PropRow label="Solid" value={effectiveMeta ? (effectiveMeta.solid ? 'Yes' : 'No') : '—'} valueColor={effectiveMeta ? (effectiveMeta.solid ? '#E24B4A' : '#97C459') : undefined} />
              <PropRow label="Group" value={effectiveMeta?.groupName ? String(effectiveMeta.groupName) : '—'} />
              <PropRow label="Layer" value={layerLabel ?? '—'} />
            </Box>
          </InspectorAccordion>
        )}

        {activeTab === 'objects' ? (
          <>
            <InspectorAccordion label="Object Properties" defaultExpanded>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <TilePreviewBox>
                  {selectedObjectType ? (
                    <ObjectTypeThumbnail objectType={selectedObjectType} tilesets={tilesets} size={72} />
                  ) : (
                    <Typography sx={{ fontSize: INSPECTOR_TEXT_SIZE, color: '#8f9baa' }}>No object selected</Typography>
                  )}
                </TilePreviewBox>
                {selectedObject && selectedObjectType ? (
                  <>
                    <PropRow label="Name" value={selectedObjectType.name} />
                    <PropRow label="Position" value={`${selectedObject.x}, ${selectedObject.y}`} />
                  </>
                ) : null}
              </Box>
            </InspectorAccordion>
            {selectedObject ? (
              <InspectorAccordion label="Instance Settings" defaultExpanded>
                <ObjectInstanceEditor object={selectedObject} objectType={selectedObjectType} tilesets={tilesets} hideHeader onUpdate={onUpdateObject} mapObjects={activeMap?.objects ?? []} />
              </InspectorAccordion>
            ) : null}
          </>
        ) : activeTab === 'events' ? (
          <>
            <InspectorAccordion label="Event Properties" defaultExpanded>
              {selectedEvent ? (
                <EventInstanceEditor event={selectedEvent} onUpdate={onUpdateEvent} />
              ) : (
                <Typography sx={{ fontSize: INSPECTOR_LABEL_SIZE, color: '#667383' }}>
                  Select an event to edit its properties.
                </Typography>
              )}
            </InspectorAccordion>

            <InspectorAccordion label="Events" defaultExpanded>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {events.length === 0 ? (
                  <Typography sx={{ fontSize: INSPECTOR_LABEL_SIZE, color: '#667383' }}>No events in this map</Typography>
                ) : events.map((event) => (
                  <Box key={event.id} sx={{ px: 1, py: INSPECTOR_ROW_Y, borderRadius: '6px', bgcolor: selectedEvent?.id === event.id ? 'rgba(77,156,255,0.12)' : 'transparent', '&:hover': { bgcolor: selectedEvent?.id === event.id ? 'rgba(77,156,255,0.14)' : 'rgba(255,255,255,0.035)' } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      {eventIcon(event.type)}
                      <Typography sx={{ fontSize: INSPECTOR_TEXT_SIZE, fontWeight: selectedEvent?.id === event.id ? 600 : 500 }}>
                        {event.name}
                      </Typography>
                      <Box sx={{ ml: 'auto', fontSize: INSPECTOR_LABEL_SIZE, color: '#8f9baa' }}>
                        ({event.x},{event.y})
                      </Box>
                      <Tooltip title="Delete event">
                        <IconButton
                          size="small"
                          onClick={(clickEvent) => {
                            clickEvent.stopPropagation()
                            void onDeleteEvent(event)
                          }}
                          sx={{
                            ml: 0.25,
                            width: 22,
                            height: 22,
                            color: '#667383',
                            borderRadius: '6px',
                            '&:hover': {
                              color: '#ff7b72',
                              bgcolor: 'rgba(255,123,114,0.10)',
                            },
                          }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <Typography sx={{ pl: 2.5, pt: 0.35, fontSize: INSPECTOR_LABEL_SIZE, color: '#667383' }}>
                      {eventSubtext(event)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </InspectorAccordion>
          </>
        ) : null}
      </Box>
    </Box>
  )
}

function InspectorAccordion({
  label,
  children,
  defaultExpanded = false,
  endIcon,
}: {
  label: string
  children: React.ReactNode
  defaultExpanded?: boolean
  endIcon?: React.ReactNode
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      sx={{
        mx: 0,
        my: 0,
        color: 'inherit',
        background: 'transparent',
        border: 'none',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '0 !important',
        boxShadow: 'none',
        '&::before': { display: 'none' },
        '&:first-of-type': { borderTop: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 16, color: '#8f9baa' }} />}
        sx={{
          minHeight: 42,
          px: 2.5,
          '&.Mui-expanded': { minHeight: 42 },
          '& .MuiAccordionSummary-content': {
            my: 0.6,
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        }}
      >
        <Typography
          sx={{
            fontSize: INSPECTOR_LABEL_SIZE,
            fontWeight: 700,
            color: '#9aa6b5',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        {endIcon}
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2.5, pt: 0.25, pb: 2 }}>
        {children}
      </AccordionDetails>
    </Accordion>
  )
}

const tilePreviewBoxSx = {
  height: 96,
  borderRadius: '6px',
  bgcolor: tok.surface.deep,
  border: '1px solid rgba(255,255,255,0.07)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  backgroundImage: `
    linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%)
  `,
  backgroundSize: '10px 10px',
  backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0',
} as const

function TilePreviewBox({ children }: { children: ReactNode }) {
  return <Box sx={tilePreviewBoxSx}>{children}</Box>
}

function ComposedTileCanvas({ tileset, col, row, size }: { tileset: Tileset; col: number; row: number; size: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const image = new Image()
    image.onload = () => {
      ctx.clearRect(0, 0, size, size)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(image, col * tileset.tileWidth, row * tileset.tileHeight, tileset.tileWidth, tileset.tileHeight, 0, 0, size, size)
    }
    image.src = tileset.imageUrl
  }, [col, row, size, tileset])

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      width={size}
      height={size}
      sx={{ width: size, height: size, imageRendering: 'pixelated', display: 'block' }}
    />
  )
}

function PropRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        px: 0.25,
        py: 0.25,
        fontSize: INSPECTOR_TEXT_SIZE,
      }}
    >
      <Typography sx={{ fontSize: INSPECTOR_TEXT_SIZE, color: '#8f9baa', fontFamily: 'inherit' }}>{label}</Typography>
      <Typography sx={{ fontSize: INSPECTOR_TEXT_SIZE, fontWeight: 600, color: valueColor ?? '#d6dee8', fontFamily: 'inherit' }}>
        {value}
      </Typography>
    </Box>
  )
}

function eventIcon(type: MapEvent['type']) {
  if (type === 'npc') return <BoltIcon sx={{ fontSize: 12, color: '#EF9F27' }} />
  if (type === 'door') return <MeetingRoomIcon sx={{ fontSize: 12, color: '#85B7EB' }} />
  if (type === 'teleport') return <FlightTakeoffIcon sx={{ fontSize: 12, color: '#B5D4F4' }} />
  if (type === 'trigger') return <AdsClickIcon sx={{ fontSize: 12, color: '#C0DD97' }} />
  if (type === 'item') return <Inventory2Icon sx={{ fontSize: 12, color: '#FAC775' }} />
  return <CodeIcon sx={{ fontSize: 12, color: '#97C459' }} />
}

function eventSubtext(event: MapEvent) {
  const interaction = event.properties.interaction as Record<string, unknown> | undefined
  if (interaction?.type === 'item') {
    const itemType = String(interaction.itemType ?? 'item').replace(/_/g, ' ')
    const amount = Number(interaction.amount ?? 1)
    return `requires: ${itemType}${amount > 1 ? ` x${amount}` : ''}`
  }
  if (interaction?.type === 'trigger') return `fires: ${String(interaction.triggerId ?? 'trigger')}`
  if (event.type === 'npc') return 'npc interaction'
  if (event.type === 'door') return 'door event'
  if (event.type === 'teleport' || event.type === 'warp') return 'warp'
  if (event.type === 'trigger') return 'trigger'
  if (event.type === 'item') return 'item event'
  return 'script: custom handler'
}
