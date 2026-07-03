import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../../app/hooks'
import {
  selectActiveTab,
  selectActiveTilesetId,
  selectActiveMapId,
  selectSelectedTileIndex,
  selectSelectedObjectId,
  selectSelectedEventTypeForPlacement,
  setActiveTab,
  setSelectedCell,
  setSelectedEventId,
  setSelectedEventTypeForPlacement,
  setSelectedObjectId,
  setSelectedTileIndex,
  setTemporaryEntryPoint,
} from '../model/editorSlice'
import type { DrawMode, EditorTab, EventType, GameMap, MapEvent, MapObject, ObjectInstanceProperties, ObjectType, SelectedArea, Tileset } from '../model/types'
import { findEventAt, findObjectAtCell, getLayerByType, normalizeSelectedArea, objectTypeForTile, removeTileCell, updateLayerTiles, upsertTileCell } from '../model/utils'
import {
  useCreateEventMutation,
  useCreateObjectTypeMutation,
  useDeleteEventMutation,
  useUpdateEventMutation,
  useUpdateMapMutation,
} from '../api/editorApi'

function layerTypeForTab(tab: EditorTab) {
  if (tab === 'events') return 'event'
  if (tab === 'objects') return 'object'
  return tab
}

function makeObjectProperties(objectType: ObjectType): ObjectInstanceProperties {
  const base: ObjectInstanceProperties = {
    objectTypeId: objectType.id,
    currentState: objectType.config.defaultState ?? null,
    movement: null,
    interaction: null,
    solidOverride: null,
  }

  if (objectType.config.objectKind !== 'door') return base

  return {
    ...base,
    currentState: 'closed',
    initialState: 'closed',
    interaction: { type: 'door' },
    states: {
      closed: {
        sprite: { tilesetId: objectType.tilesetId, tileIndex: objectType.config.visual.tileIndex },
        collision: 'solid',
      },
      open: {
        sprite: { tilesetId: objectType.tilesetId, tileIndex: objectType.config.visual.tileIndex },
        collision: 'passable',
      },
    },
    trigger: { type: 'key', requiredItem: 'small_key', consume: true },
    persistence: 'one_shot',
  }
}

function defaultEventProperties(eventType: EventType): Record<string, unknown> {
  if (eventType === 'door' || eventType === 'item') {
    return { interaction: { type: 'item', itemType: 'small_key', amount: 1, consume: true } }
  }
  if (eventType === 'trigger') {
    return { interaction: { type: 'trigger', triggerId: '' } }
  }
  return {}
}

function composedTileDefaultSolid(tileset: Tileset | undefined, tileIndex: number): boolean {
  if (!tileset?.tileMap || Object.keys(tileset.tileMap).length === 0) return false
  const slot = `${tileIndex % Math.max(1, tileset.columns)},${Math.floor(tileIndex / Math.max(1, tileset.columns))}`
  for (const group of tileset.groups ?? []) {
    const slotIndex = (group.tiles ?? []).indexOf(slot)
    if (slotIndex < 0) continue
    const tileRef = group.tileRefs?.[slotIndex]
    const overrides = (group.metadata?.tileOverrides ?? {}) as Record<string, { solid?: boolean }>
    const override = tileRef ? overrides[String(tileRef.tileId)] : undefined
    return Boolean(
      override?.solid ??
      group.solid ??
      group.metadata?.solid ??
      (String(group.metadata?.defaultCollision ?? 'none') === 'solid' || group.type === 'wall' || tileset.type === 'object'),
    )
  }
  return false
}

export type UseMapPainterParams = {
  draftMap: GameMap | null
  onUpdateDraftMap: React.Dispatch<React.SetStateAction<GameMap | null>>
  events: MapEvent[]
  serverObjectTypes: ObjectType[]
  environmentTilesets: Tileset[]
  activeProjectId: number | null
}

export function useMapPainter({
  draftMap,
  onUpdateDraftMap: setDraftMap,
  events,
  serverObjectTypes,
  environmentTilesets,
  activeProjectId,
}: UseMapPainterParams) {
  const dispatch = useAppDispatch()
  const activeTab = useAppSelector(selectActiveTab)
  const activeTilesetId = useAppSelector(selectActiveTilesetId)
  const activeMapId = useAppSelector(selectActiveMapId)
  const selectedTileIndex = useAppSelector(selectSelectedTileIndex)
  const selectedObjectId = useAppSelector(selectSelectedObjectId)
  const selectedEventTypeForPlacement = useAppSelector(selectSelectedEventTypeForPlacement)

  const [drawMode, setDrawMode] = useState<DrawMode>('single')
  const [selectedArea, setSelectedArea] = useState<SelectedArea | null>(null)
  const [isAreaDragging, setIsAreaDragging] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; cellX: number; cellY: number } | null>(null)
  const [selectedObjectTypeId, setSelectedObjectTypeId] = useState<string | null>(null)
  const [localObjectTypes, setLocalObjectTypes] = useState<ObjectType[]>([])

  const drawModeRef = useRef(drawMode)
  const eraseAreaRef = useRef<SelectedArea | null>(null)
  const draftMapRef = useRef(draftMap)
  const activeTabRef = useRef(activeTab)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isPaintDraggingRef = useRef(false)

  const [updateMap] = useUpdateMapMutation()
  const [createObjectType] = useCreateObjectTypeMutation()
  const [createEvent] = useCreateEventMutation()
  const [updateEvent] = useUpdateEventMutation()
  const [deleteEvent] = useDeleteEventMutation()

  const objectTypes: ObjectType[] = [
    ...serverObjectTypes,
    ...localObjectTypes.filter((local) => !serverObjectTypes.some((server) => String(server.id) === String(local.id))),
  ]

  useEffect(() => {
    setLocalObjectTypes([])
  }, [activeProjectId])

  useEffect(() => {
    drawModeRef.current = drawMode
    draftMapRef.current = draftMap
    activeTabRef.current = activeTab
  }, [activeTab, draftMap, drawMode])

  const persistMapDraft = (map: GameMap) => updateMap({
    mapId: map.id,
    body: {
      name: map.name,
      width: map.width,
      height: map.height,
      tileWidth: map.tileWidth,
      tileHeight: map.tileHeight,
      layers: map.layers,
      objects: map.objects ?? [],
      spawnPoint: map.spawnPoint ?? null,
    },
  })

  useEffect(() => {
    if (!draftMap) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      void persistMapDraft(draftMap)
    }, 800)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [draftMap, updateMap]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush pending auto-save immediately on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current !== null && draftMapRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        void persistMapDraft(draftMapRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetSelectedArea = () => {
    setSelectedArea(null)
    setIsAreaDragging(false)
    eraseAreaRef.current = null
  }

  useEffect(() => {
    resetSelectedArea()
  }, [activeMapId, activeTilesetId, drawMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isAreaDragging) return

    const previousUserSelect = document.body.style.userSelect
    const previousWebkitUserSelect = document.body.style.webkitUserSelect
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'

    const handlePointerUp = () => {
      if (drawModeRef.current === 'erase') {
        const area = eraseAreaRef.current
        const map = draftMapRef.current
        const layerType = layerTypeForTab(activeTabRef.current)
        if (area && activeTabRef.current === 'events') {
          const norm = normalizeSelectedArea(area)
          const eventsToDelete = events.filter((event) => (
            event.x >= norm.minX && event.x <= norm.maxX && event.y >= norm.minY && event.y <= norm.maxY
          ))
          for (const event of eventsToDelete) {
            void deleteEvent({ eventId: event.id, mapId: event.mapId }).unwrap().catch(() => {})
          }
          dispatch(setSelectedEventId(null))
        } else if (area && map && activeTabRef.current === 'objects') {
          const norm = normalizeSelectedArea(area)
          const nextObjects = (map.objects ?? []).filter((object) => {
            const objectType = objectTypes.find((candidate) => String(candidate.id) === String(object.objectTypeId))
            const spanX = objectType?.config.visual.spanX ?? objectType?.spanX ?? 1
            const spanY = objectType?.config.visual.spanY ?? objectType?.spanY ?? 1
            const overlaps =
              object.x <= norm.maxX &&
              object.x + spanX - 1 >= norm.minX &&
              object.y <= norm.maxY &&
              object.y + spanY - 1 >= norm.minY
            return !overlaps
          })
          setDraftMap({ ...map, objects: nextObjects })
          dispatch(setSelectedObjectId(null))
        } else if (area && map && layerType !== 'event' && layerType !== 'object') {
          const layer = getLayerByType(map, layerType)
          if (layer) {
            const norm = normalizeSelectedArea(area)
            let nextTiles = layer.tiles
            for (let cy = norm.minY; cy <= norm.maxY; cy += 1) {
              for (let cx = norm.minX; cx <= norm.maxX; cx += 1) {
                nextTiles = removeTileCell(nextTiles, cx, cy)
              }
            }
            setDraftMap(updateLayerTiles(map, layerType, nextTiles))
          }
        }
        eraseAreaRef.current = null
        setSelectedArea(null)
      }
      setIsAreaDragging(false)
    }

    window.addEventListener('mouseup', handlePointerUp)
    return () => {
      document.body.style.userSelect = previousUserSelect
      document.body.style.webkitUserSelect = previousWebkitUserSelect
      window.removeEventListener('mouseup', handlePointerUp)
    }
  }, [deleteEvent, dispatch, events, isAreaDragging, objectTypes]) // eslint-disable-line react-hooks/exhaustive-deps

  const findObjectLayerTileAtCell = (map: GameMap | null, x: number, y: number) => {
    const objectLayer = map ? getLayerByType(map, 'object') : null
    return objectLayer?.tiles.find((tile) => tile.x === x && tile.y === y) ?? null
  }

  const eraseObjectAtCell = (map: GameMap, x: number, y: number) => {
    const object = findObjectAtCell(map?.objects ?? [], objectTypes, x, y)
    if (!object) return map
    dispatch(setSelectedObjectId(null))
    return { ...map, objects: (map.objects ?? []).filter((candidate) => candidate.id !== object.id) }
  }

  const eraseActiveLayerCell = (x: number, y: number) => {
    if (activeTab === 'events') {
      dispatch(setSelectedCell(null))
      const existingEvent = findEventAt(events, x, y)
      if (existingEvent) {
        void deleteEvent({ eventId: existingEvent.id, mapId: existingEvent.mapId }).unwrap().catch(() => {})
      }
      dispatch(setSelectedEventId(null))
      return
    }

    if (!draftMap) return

    if (activeTab === 'objects') {
      dispatch(setSelectedCell(null))
      const existingObject = findObjectAtCell(draftMap?.objects ?? [], objectTypes, x, y)
      if (existingObject) {
        setDraftMap(eraseObjectAtCell(draftMap, x, y))
        return
      }
      const objectLayer = getLayerByType(draftMap, 'object')
      if (objectLayer) {
        setDraftMap(updateLayerTiles(draftMap, 'object', removeTileCell(objectLayer.tiles, x, y)))
      }
      return
    }

    dispatch(setSelectedCell({ x, y }))
    const layerType = layerTypeForTab(activeTab)
    const layer = getLayerByType(draftMap, layerType)
    if (!layer) return
    setDraftMap(updateLayerTiles(draftMap, layerType, removeTileCell(layer.tiles, x, y)))
  }

  const placeObjectAtCell = (objectType: ObjectType, x: number, y: number) => {
    const nextObject: MapObject = {
      id: crypto.randomUUID(),
      objectTypeId: objectType.id,
      x,
      y,
      properties: makeObjectProperties(objectType),
    }
    setDraftMap((current) => (
      current
        ? { ...current, objects: [...(current.objects ?? []).filter((object) => !(object.x === x && object.y === y)), nextObject] }
        : current
    ))
    dispatch(setSelectedObjectId(nextObject.id))
    dispatch(setSelectedCell(null))
  }

  const ensureObjectTypeForTile = async (tilesetId: number | null, tileIndex: number | null) => {
    if (!activeProjectId || tilesetId == null || tileIndex == null) return null
    const existingObjectType = objectTypeForTile(objectTypes, tilesetId, tileIndex)
    if (existingObjectType) return existingObjectType
    const sourceTileset = environmentTilesets.find((tileset) => tileset.id === tilesetId)
    const sourceTile = sourceTileset?.tiles.find((tile) => tile.index === tileIndex)
    const tileName = sourceTile?.metadata.groupName
    const fallbackDefaultSolid = Boolean(
      sourceTile?.metadata.solid ??
      sourceTile?.metadata.defaultSolid ??
      (sourceTile?.metadata.defaultCollision != null
        ? String(sourceTile.metadata.defaultCollision) === 'solid'
        : composedTileDefaultSolid(sourceTileset, tileIndex)),
    )
    const created = await createObjectType({
      projectId: activeProjectId,
      body: {
        name: typeof tileName === 'string' && tileName.trim() ? tileName : `Object ${tileIndex}`,
        category: 'decoration',
        tilesetId,
        spanX: 1,
        spanY: 1,
        config: {
          visual: { tileIndex, spanX: 1, spanY: 1 },
          defaultSolid: fallbackDefaultSolid,
        },
      },
    }).unwrap()
    setLocalObjectTypes((current) => (
      current.some((objectType) => String(objectType.id) === String(created.id)) ? current : [...current, created]
    ))
    return created
  }

  const ensureObjectTypeForSelectedTile = () => ensureObjectTypeForTile(activeTilesetId, selectedTileIndex)

  const handleSelectTab = (tab: EditorTab) => {
    dispatch(setActiveTab(tab))
    dispatch(setSelectedCell(null))
    setSelectedArea(null)
    setIsAreaDragging(false)
    if (tab !== 'background') dispatch(setSelectedTileIndex(null))
    if (tab !== 'objects') {
      setSelectedObjectTypeId(null)
      dispatch(setSelectedObjectId(null))
    }
    if (tab !== 'events') {
      dispatch(setSelectedEventId(null))
      dispatch(setSelectedEventTypeForPlacement(null))
    }
  }

  const handlePaintCell = (x: number, y: number) => {
    if (drawMode === 'select') {
      if (activeTab === 'events') {
        dispatch(setSelectedCell(null))
        const existingEvent = findEventAt(events, x, y)
        dispatch(setSelectedEventId(existingEvent?.id ?? null))
        dispatch(setSelectedObjectId(null))
      } else if (activeTab === 'objects') {
        dispatch(setSelectedCell(null))
        const existingObject = findObjectAtCell(draftMap?.objects ?? [], objectTypes, x, y)
        if (existingObject) {
          dispatch(setSelectedObjectId(existingObject.id))
          dispatch(setSelectedEventId(null))
          dispatch(setSelectedTileIndex(null))
          setSelectedObjectTypeId(null)
          return
        }
        const objectLayerTile = findObjectLayerTileAtCell(draftMap, x, y)
        if (objectLayerTile) {
          void ensureObjectTypeForTile(objectLayerTile.tilesetId, objectLayerTile.tileIndex).then((objectType) => {
            if (!objectType) return
            const nextObject: MapObject = {
              id: crypto.randomUUID(),
              objectTypeId: objectType.id,
              x,
              y,
              properties: makeObjectProperties(objectType),
            }
            setDraftMap((current) => {
              if (!current) return current
              const objectLayer = getLayerByType(current, 'object')
              const withoutObjectTile = objectLayer
                ? updateLayerTiles(current, 'object', removeTileCell(objectLayer.tiles, x, y))
                : current
              return { ...withoutObjectTile, objects: [...(withoutObjectTile.objects ?? []).filter((object) => !(object.x === x && object.y === y)), nextObject] }
            })
            dispatch(setSelectedObjectId(nextObject.id))
          }).catch(() => {})
        } else {
          dispatch(setSelectedObjectId(null))
        }
        dispatch(setSelectedEventId(null))
        dispatch(setSelectedTileIndex(null))
        setSelectedObjectTypeId(null)
      } else {
        dispatch(setSelectedCell({ x, y }))
        dispatch(setSelectedObjectId(null))
        dispatch(setSelectedEventId(null))
      }
      return
    }

    if (drawMode === 'area') return

    if (drawMode === 'erase') {
      eraseActiveLayerCell(x, y)
      return
    }

    if (!draftMap) return

    if (activeTab === 'objects') {
      dispatch(setSelectedCell(null))
      const selectedObjectType = selectedObjectTypeId
        ? objectTypes.find((objectType) => String(objectType.id) === String(selectedObjectTypeId)) ?? null
        : null
      if (selectedObjectType) {
        placeObjectAtCell(selectedObjectType, x, y)
        return
      }
      if (selectedTileIndex != null) {
        void ensureObjectTypeForSelectedTile().then((objectType) => {
          if (objectType) {
            placeObjectAtCell(objectType, x, y)
            setSelectedObjectTypeId(objectType.id)
            dispatch(setSelectedTileIndex(null))
          }
        }).catch(() => {})
        return
      }
      const existingObject = findObjectAtCell(draftMap?.objects ?? [], objectTypes, x, y)
      dispatch(setSelectedObjectId(existingObject?.id ?? null))
      return
    }

    if (activeTab === 'events') {
      dispatch(setSelectedCell(null))
      if (selectedEventTypeForPlacement) {
        void createEvent({
          mapId: draftMap.id,
          body: {
            name: selectedEventTypeForPlacement,
            x,
            y,
            type: selectedEventTypeForPlacement,
            iconTile: null,
            properties: defaultEventProperties(selectedEventTypeForPlacement),
          },
        }).unwrap().then((created) => {
          dispatch(setSelectedEventId(created.id))
        }).catch(() => {})
        return
      }
      const existingEvent = findEventAt(events, x, y)
      dispatch(setSelectedEventId(existingEvent?.id ?? null))
      return
    }

    dispatch(setSelectedCell({ x, y }))
    const paintLayerType = layerTypeForTab(activeTab)
    const layer = getLayerByType(draftMap, paintLayerType)
    if (!layer) return

    let nextTiles = layer.tiles
    if (selectedTileIndex === null) {
      nextTiles = removeTileCell(layer.tiles, x, y)
    } else if (activeTilesetId) {
      nextTiles = upsertTileCell(layer.tiles, { x, y, tilesetId: activeTilesetId, tileIndex: selectedTileIndex })
    }
    setDraftMap(updateLayerTiles(draftMap, paintLayerType, nextTiles))
  }

  const handlePaintSelectedArea = (tileIndex: number) => {
    if (!selectedArea || !draftMap || !activeTilesetId) { resetSelectedArea(); return }
    const layerType = layerTypeForTab(activeTab)
    if (layerType === 'event' || layerType === 'object') { resetSelectedArea(); return }
    const layer = getLayerByType(draftMap, layerType)
    if (!layer) return
    const normalizedArea = normalizeSelectedArea(selectedArea)
    let nextTiles = layer.tiles
    for (let y = normalizedArea.minY; y <= normalizedArea.maxY; y += 1) {
      for (let x = normalizedArea.minX; x <= normalizedArea.maxX; x += 1) {
        nextTiles = upsertTileCell(nextTiles, { x, y, tilesetId: activeTilesetId, tileIndex })
      }
    }
    setDraftMap(updateLayerTiles(draftMap, layerType, nextTiles))
    resetSelectedArea()
  }

  const handleEraseSelectedArea = () => {
    if (!selectedArea || !draftMap) { resetSelectedArea(); return }
    const layerType = layerTypeForTab(activeTab)
    if (layerType === 'event' || layerType === 'object') { resetSelectedArea(); return }
    const layer = getLayerByType(draftMap, layerType)
    if (!layer) { resetSelectedArea(); return }
    const normalizedArea = normalizeSelectedArea(selectedArea)
    let nextTiles = layer.tiles
    for (let y = normalizedArea.minY; y <= normalizedArea.maxY; y += 1) {
      for (let x = normalizedArea.minX; x <= normalizedArea.maxX; x += 1) {
        nextTiles = removeTileCell(nextTiles, x, y)
      }
    }
    setDraftMap(updateLayerTiles(draftMap, layerType, nextTiles))
    resetSelectedArea()
  }

  const handleAreaSelectionStart = (x: number, y: number) => {
    if (drawMode === 'select') {
      handlePaintCell(x, y)
      return
    }
    if (drawMode !== 'area' && drawMode !== 'erase') {
      if (drawMode === 'single') {
        isPaintDraggingRef.current = true
        handlePaintCell(x, y)
        const onUp = () => {
          isPaintDraggingRef.current = false
          window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mouseup', onUp)
      }
      return
    }
    if (activeTab === 'objects' || activeTab === 'events') {
      dispatch(setSelectedCell(null))
    } else {
      dispatch(setSelectedCell({ x, y }))
    }
    const startArea = { start: { x, y }, end: { x, y } }
    setSelectedArea(startArea)
    setIsAreaDragging(true)
    if (drawMode === 'erase') eraseAreaRef.current = startArea
  }

  const handleCellHover = (x: number, y: number) => {
    setHoveredCell({ x, y })
    if (drawMode === 'single' && isPaintDraggingRef.current) {
      handlePaintCell(x, y)
      return
    }
    if ((drawMode !== 'area' && drawMode !== 'erase') || !isAreaDragging) return
    setSelectedArea((current) => (current ? { ...current, end: { x, y } } : current))
    if (drawMode === 'erase' && eraseAreaRef.current) {
      eraseAreaRef.current = { ...eraseAreaRef.current, end: { x, y } }
    }
  }

  const handleAreaSelectionEnd = (x: number, y: number) => {
    if ((drawMode !== 'area' && drawMode !== 'erase') || !isAreaDragging) return
    setSelectedArea((current) => (current ? { ...current, end: { x, y } } : current))
    if (drawMode === 'erase') {
      if (eraseAreaRef.current) eraseAreaRef.current = { ...eraseAreaRef.current, end: { x, y } }
      return
    }
    setIsAreaDragging(false)
  }

  const handleSaveMap = async () => {
    if (!draftMap) return
    try {
      const saved = await persistMapDraft(draftMap).unwrap()
      setDraftMap(saved)
    } catch { }
  }

  const handleSelectMap = (mapId: number) => {
    void mapId // consumed by caller which also dispatches setActiveMapId
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    if (draftMap) void persistMapDraft(draftMap).unwrap().catch(() => {})
  }

  const handleSetTemporaryEntryPoint = (x: number, y: number) => {
    if (!activeMapId || !draftMap) return
    dispatch(setTemporaryEntryPoint({ mapId: activeMapId, x, y }))
    const nextMap = { ...draftMap, spawnPoint: { x, y } }
    setDraftMap(nextMap)
    void persistMapDraft(nextMap).unwrap().then((saved) => { setDraftMap(saved) }).catch(() => {})
  }

  const handleEraseCell = (x: number, y: number) => {
    eraseActiveLayerCell(x, y)
  }

  const handleUpdateObject = useCallback((objectId: string, updates: Partial<MapObject>) => {
    setDraftMap((current) => {
      if (!current) return current
      return {
        ...current,
        objects: (current.objects ?? []).map((object) => (
          object.id === objectId ? { ...object, ...updates } : object
        )),
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateEventProperties = async (event: MapEvent, properties: Record<string, unknown>, objectTypeId?: string | null) => {
    if (!activeMapId) return
    const updated = await updateEvent({
      eventId: event.id,
      mapId: activeMapId,
      body: {
        name: event.name,
        x: event.x,
        y: event.y,
        type: event.type,
        iconTile: event.iconTile,
        properties,
        objectTypeId: objectTypeId ?? event.objectTypeId,
      },
    }).unwrap()
    dispatch(setSelectedEventId(updated.id))
  }

  const handleDeleteEvent = async (event: MapEvent) => {
    await deleteEvent({ eventId: event.id, mapId: event.mapId }).unwrap()
    dispatch(setSelectedEventId(null))
  }

  const handleCellContextMenu = (mouseX: number, mouseY: number, cellX: number, cellY: number) => {
    if (activeTab === 'objects' && draftMap) {
      dispatch(setSelectedCell(null))
      setDraftMap(eraseObjectAtCell(draftMap, cellX, cellY))
      return
    }
    setContextMenu({ mouseX, mouseY, cellX, cellY })
  }

  const handleCloseContextMenu = () => {
    setContextMenu(null)
  }

  return {
    drawMode,
    setDrawMode,
    selectedArea,
    isAreaDragging,
    hoveredCell,
    contextMenu,
    selectedObjectTypeId,
    setSelectedObjectTypeId,
    objectTypes,
    handleSelectTab,
    handlePaintCell,
    handlePaintSelectedArea,
    handleEraseSelectedArea,
    handleAreaSelectionStart,
    handleAreaSelectionEnd,
    handleCellHover,
    handleEraseCell,
    handleCellContextMenu,
    handleCloseContextMenu,
    handleSetTemporaryEntryPoint,
    handleSaveMap,
    handleSelectMap,
    handleUpdateObject,
    handleUpdateEventProperties,
    handleDeleteEvent,
  }
}
