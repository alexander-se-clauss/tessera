import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  useAddTilesToTilesetMutation,
  useCreateObjectTypeMutation,
  useListObjectTypesQuery,
  useMoveTileToTilesetGroupMutation,
  useRestitchTilesetTileMutation,
  useUpdateTilesetGroupsMutation,
  useUpdateObjectTypeMutation,
} from '../../api/editorApi'
import type { ExtractedTile, Tileset, TileType } from '../../model/types'
import { useAuthErrorMessage } from '../../../auth/hooks/useAuthErrorMessage'
import type { AnimationFrameRef, GroupDraft, ObjectStateDraftDef, ObjectStateTransitionDraft, ObjectTypeDraft, TileOverride, TilesetImportDialogProps } from './types'
import {
  OBJECTS_GROUP_ID,
  applyTilesToLayout,
  groupsFromTileset,
  moveLayoutItem,
  normalizeLayout,
  slotForTileIndex,
  stripImportOffsets,
  tilesFromTileset,
} from './tilesetImportUtils'

export function useTilesetImport({
  open,
  projectId,
  availableTilesets = [],
  editingTileset = null,
  onClose,
  onImported,
}: TilesetImportDialogProps) {
  const isEditing = Boolean(editingTileset)
  const targetTileset = editingTileset
  const { getMessage, isAuthFailure } = useAuthErrorMessage()
  const [addTilesToTileset, { isLoading: isAddingTiles }] = useAddTilesToTilesetMutation()
  const [updateTilesetGroups, { isLoading: isUpdatingGroups }] = useUpdateTilesetGroupsMutation()
  const [moveTileToTilesetGroup] = useMoveTileToTilesetGroupMutation()
  const [restitchTile] = useRestitchTilesetTileMutation()
  const [createObjectType] = useCreateObjectTypeMutation()
  const [updateObjectType] = useUpdateObjectTypeMutation()
  const { data: existingObjectTypes = [] } = useListObjectTypesQuery(
    { projectId, tilesetId: editingTileset?.id ?? 0 },
    { skip: !open || !editingTileset },
  )

  const [step, setStep] = useState(0)
  const [savedTilesetId, setSavedTilesetId] = useState<number | null>(null)
  const [objectDrafts, setObjectDrafts] = useState<ObjectTypeDraft[]>([])

  const [assetName, setAssetName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [importSession, setImportSession] = useState<null | { importId: number; name: string; tiles: ExtractedTile[] }>(null)
  const [approvedTileIds, setApprovedTileIds] = useState<number[]>([])
  const [organizeSelectedTileIds, setOrganizeSelectedTileIds] = useState<number[]>([])
  const [groups, setGroups] = useState<GroupDraft[]>([])
  const [newGroupName, setNewGroupName] = useState('Ground')
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [draggedLayoutItem, setDraggedLayoutItem] = useState<{ tileId: number | null; x: number; y: number } | null>(null)
  const [selectedLayoutTileId, setSelectedLayoutTileId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, setIsCreatingGroup] = useState(false)
  const [gridW, setGridW] = useState(16)
  const [gridH, setGridH] = useState(16)
  const [selectedDestinationTilesetId, setSelectedDestinationTilesetId] = useState<number | ''>('')
  const [syntheticTiles, setSyntheticTiles] = useState<ExtractedTile[]>([])
  const [restitchRevision, setRestitchRevision] = useState(0)
  const imageUrlRef = useRef('')
  const restitchedFilterKeysRef = useRef(new Set<string>())
  const pendingRestitchTileIdsRef = useRef(new Set<number>())

  useEffect(() => {
    imageUrlRef.current = imageUrl
  }, [imageUrl])

  const resetDialog = useCallback(() => {
    setStep(0)
    setSavedTilesetId(null)
    setAssetName('')
    setFile(null)
    if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
    setImageUrl('')
    setImageSize({ width: 0, height: 0 })
    setImportSession(null)
    setApprovedTileIds([])
    setOrganizeSelectedTileIds([])
    setGroups([])
    setNewGroupName('Ground')
    setActiveGroupId(null)
    setDraggedLayoutItem(null)
    setSelectedLayoutTileId(null)
    setIsCreatingGroup(false)
    setObjectDrafts([])
    setGridW(16)
    setGridH(16)
    setSelectedDestinationTilesetId('')
    setSyntheticTiles([])
    setRestitchRevision(0)
    restitchedFilterKeysRef.current.clear()
    pendingRestitchTileIdsRef.current.clear()
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) resetDialog()
  }, [open, resetDialog])

  useEffect(() => {
    if (!open || !targetTileset || savedTilesetId !== null) return
    setStep(0)
    setError(null)
    setAssetName(targetTileset.name)
    setSelectedDestinationTilesetId(targetTileset.id)
  }, [open, savedTilesetId, targetTileset])

  useEffect(() => {
    if (!open || !isEditing || existingObjectTypes.length === 0) return
    setObjectDrafts(
      existingObjectTypes.map((ot) => ({
        id: ot.id,
        serverId: ot.id,
        name: ot.name,
        category: ot.category as ObjectTypeDraft['category'],
        tilesetId: ot.tilesetId,
        spanX: ot.spanX,
        spanY: ot.spanY,
        config: ot.config as ObjectTypeDraft['config'],
      })),
    )
  }, [open, isEditing, existingObjectTypes])

  useEffect(() => {
    if (!open) return
    if (!file) {
      if (!editingTileset) {
        if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
        setImageUrl('')
        setImageSize({ width: 0, height: 0 })
      }
      return
    }

    let cancelled = false
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (cancelled) { URL.revokeObjectURL(objectUrl); return }
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
      setImageUrl(objectUrl)
      setAssetName((current) => current || file.name.replace(/\.png$/i, ''))
    }
    image.onerror = () => {
      if (!cancelled) { URL.revokeObjectURL(objectUrl); setError('Failed to load image. Make sure it is a valid PNG.') }
    }
    image.src = objectUrl
    return () => { cancelled = true }
  }, [editingTileset, file, open])

  const allTiles = useMemo(() => syntheticTiles, [syntheticTiles])
  const approvedTiles = useMemo(
    () => allTiles.filter((tile) => approvedTileIds.includes(tile.id)),
    [allTiles, approvedTileIds],
  )
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? null
  const selectedDestinationTileset = targetTileset ?? availableTilesets.find((tileset) => tileset.id === selectedDestinationTilesetId) ?? null
  const selectedDestinationIsObjectTileset = selectedDestinationTileset
    ? tilesetKind(selectedDestinationTileset) === 'object'
    : false

  const seedTilesetDraft = useCallback((tileset: Tileset | null) => {
    if (!tileset) {
      setGroups([])
      setActiveGroupId(null)
      return
    }
    const seededTiles = tilesFromTileset(tileset)
    const isObjectTileset = tilesetKind(tileset) === 'object'
    const seededGroups = groupsFromTileset(tileset, seededTiles).map((group) => (
      isObjectTileset
        ? {
            ...group,
            metadata: {
              ...group.metadata,
              tileType: 'object',
              solid: group.metadata.solid ?? true,
              defaultCollision: group.metadata.defaultCollision ?? ((group.metadata.solid ?? true) ? 'solid' : 'none'),
            },
          }
        : group
    ))
    setSyntheticTiles((current) => {
      const sourceTiles = current.filter((tile) => !String(tile.hash).startsWith('existing-'))
      return [...seededTiles, ...sourceTiles]
    })
    setApprovedTileIds((current) => Array.from(new Set([...seededTiles.map((tile) => tile.id), ...current])))
    setGridW(tileset.tileWidth)
    setGridH(tileset.tileHeight)
    setGroups(seededGroups)
    setActiveGroupId(seededGroups[0]?.id ?? null)
    setSelectedLayoutTileId(null)
  }, [])

  const handleSelectDestinationTileset = useCallback((tilesetId: number | '') => {
    setSelectedDestinationTilesetId(tilesetId)
    const tileset = availableTilesets.find((candidate) => candidate.id === tilesetId) ?? null
    seedTilesetDraft(tileset)
  }, [availableTilesets, seedTilesetDraft])

  useEffect(() => {
    if (!activeGroupId && groups[0]) setActiveGroupId(groups[0].id)
  }, [activeGroupId, groups])

  const canAdvanceFromExtract = Boolean(selectedDestinationTileset) && (!!file || Boolean(targetTileset))
  const canAdvanceFromOrganize = groups.some((group) => group.tileRefs.length > 0)
  const canFinishComposedImport = targetTileset || selectedDestinationTilesetId
    ? groups.some((group) => group.tileRefs.length > 0)
    : false

  const syncObjectDrafts = useCallback(() => {
    setObjectDrafts((prevDrafts) => {
      const newDrafts: ObjectTypeDraft[] = []
      for (const group of groups) {
        const groupTileType = group.metadata.tileType as TileType | undefined
        const tileOverrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
        for (const ref of group.tileRefs) {
          const override = tileOverrides[String(ref.tileId)] ?? {}
          const effectiveType = override.tileType ?? groupTileType
          if (effectiveType !== 'object') continue
          const tile = allTiles.find((t) => t.id === ref.tileId)
          const tileIndex = tile?.index ?? 0
          const existingDraft = prevDrafts.find((d) => d.config.visual.tileIndex === tileIndex)
          if (isEditing && !existingDraft) continue
          const groupDefaultSolid =
            Boolean(group.metadata.solid ?? false) ||
            String(group.metadata.defaultCollision ?? 'none') === 'solid'
          const defaultSolid = override.solid ?? groupDefaultSolid
          const objectKind = override.objectKind ?? existingDraft?.config.objectKind ?? 'object'
          const stateDefs = group.metadata.stateDefs as ObjectStateDraftDef[] | undefined
          const stateTransitions = group.metadata.stateTransitions as ObjectStateTransitionDraft[] | undefined
          newDrafts.push({
            id: `object-${ref.tileId}`,
            serverId: existingDraft?.serverId,
            name: existingDraft?.name ?? `Object ${tileIndex}`,
            category: objectKind === 'door'
              ? 'interactive'
              : (override.objectCategory as ObjectTypeDraft['category']) ?? existingDraft?.category ?? 'decoration',
            tilesetId: savedTilesetId ?? editingTileset?.id ?? 0,
            spanX: existingDraft?.spanX ?? 1,
            spanY: existingDraft?.spanY ?? 1,
            config: {
              visual: { tileIndex, spanX: existingDraft?.spanX ?? 1, spanY: existingDraft?.spanY ?? 1 },
              objectKind,
              defaultSolid: objectKind === 'door' ? true : defaultSolid,
              ...(existingDraft?.config.animation ? { animation: existingDraft.config.animation } : {}),
              ...(existingDraft?.config.states ? { states: existingDraft.config.states } : {}),
              ...(existingDraft?.config.defaultState ? { defaultState: existingDraft.config.defaultState } : {}),
              ...(group.metadata.isStateful ? { isStateful: true } : {}),
              ...(stateDefs ? { stateDefs } : {}),
              ...(stateTransitions ? { stateTransitions } : {}),
            },
          })
        }
      }
      const orphans = prevDrafts.filter((d) => d.serverId && !newDrafts.some((nd) => nd.serverId === d.serverId))
      return [...newDrafts, ...orphans]
    })
  }, [groups, allTiles, savedTilesetId, editingTileset, isEditing])

  const handleUpload = async () => {
    setError(null)
    if (!selectedDestinationTileset) {
      setGroups([])
      setActiveGroupId(null)
      setSelectedLayoutTileId(null)
      setStep(1)
      return
    }
    const seededTiles = tilesFromTileset(selectedDestinationTileset)
    const seededGroups = groupsFromTileset(selectedDestinationTileset, seededTiles)
    setSyntheticTiles(seededTiles)
    setApprovedTileIds(seededTiles.map((tile) => tile.id))
    setGridW(selectedDestinationTileset.tileWidth)
    setGridH(selectedDestinationTileset.tileHeight)
    setOrganizeSelectedTileIds([])
    setGroups(seededGroups)
    setActiveGroupId(seededGroups[0]?.id ?? null)
    setSelectedLayoutTileId(null)
    setStep(1)
  }

  const handleSave = async () => {
    setError(null)
    setStep(2)
  }

  const handleDone = async () => {
    try {
      setError(null)
      let importedTilesetId: number | null = null
      const selectedTilesets = targetTileset
        ? [targetTileset]
        : availableTilesets.filter((tileset) => tileset.id === selectedDestinationTilesetId)
      for (const tileset of selectedTilesets) {
        const assignedGroups = groups.filter((group) => group.tileRefs.length > 0)
        if (assignedGroups.length === 0) continue
        const assignedTerrainGroups = assignedGroups.filter((group) => String(group.metadata.systemRole) !== 'objects' && group.name !== 'Objects')
        const assignedObjectGroup = assignedGroups.find((group) => String(group.metadata.systemRole) === 'objects' || group.name === 'Objects') ?? null
        const tileOverridesById = new Map<number, TileOverride>()
        for (const group of assignedGroups) {
          const tileOverrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
          for (const [tileId, override] of Object.entries(tileOverrides)) {
            tileOverridesById.set(Number(tileId), override)
          }
        }
        const frameTileIdsForOverride = (override: TileOverride | undefined) => {
          if (!override) return []
          if (override.animationFrames?.length) return override.animationFrames.map((frame) => frame.tileId)
          return override.animationFrameTileIds ?? []
        }
        const requiredSourceTileIds = Array.from(new Set(assignedGroups.flatMap((group) =>
          group.tileRefs.flatMap((ref) => [ref.tileId, ...frameTileIdsForOverride(tileOverridesById.get(ref.tileId))]),
        )))
        const newSourceTiles = requiredSourceTileIds
          .map((tileId) => syntheticTiles.find((candidate) => candidate.id === tileId))
          .filter((tile): tile is ExtractedTile => tile != null && !String(tile.hash).startsWith('existing-'))

        if (newSourceTiles.length > 0 && !file) {
          setError('Choose a source PNG before adding new tiles or animation frames.')
          return
        }

        const tileInstructions = assignedGroups.flatMap((group) => {
          const tileOverrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
          return group.tileRefs
            .filter((ref) => {
              const tile = syntheticTiles.find((candidate) => candidate.id === ref.tileId)
              return tile && !String(tile.hash).startsWith('existing-')
            })
            .map((ref) => {
              const tile = syntheticTiles.find((candidate) => candidate.id === ref.tileId)
              const occurrence = tile?.sourceOccurrences[0]
              const override = tileOverrides[String(ref.tileId)] ?? {}
              const sequenceFrames = override.animationFrames?.length
                ? override.animationFrames
                : [ref.tileId, ...(override.animationFrameTileIds ?? [])].map((tileId) => {
                    const frameTile = syntheticTiles.find((candidate) => candidate.id === tileId)
                    return frameTile ? { tileId, tileIndex: frameTile.index, x: 0, y: 0 } : null
                  }).filter((frame): frame is NonNullable<typeof frame> => frame != null)
              const frameTiles = sequenceFrames
                .map((frame) => ({
                  frame,
                  tile: syntheticTiles.find((candidate) => candidate.id === frame.tileId),
                }))
                .filter((candidate): candidate is { frame: typeof sequenceFrames[number]; tile: ExtractedTile } => candidate.tile != null && !String(candidate.tile.hash).startsWith('existing-'))
              return {
                clientId: String(ref.tileId),
                sourceX: (occurrence?.x ?? 0) + Number(override.sourceOffsetX ?? 0),
                sourceY: (occurrence?.y ?? 0) + Number(override.sourceOffsetY ?? 0),
                width: gridW,
                height: gridH,
                blockedColors: override.blockedColors ?? [],
                deletedPixels: override.deletedPixels ?? [],
                animated: frameTiles.length > 1,
                frameDuration: Number(override.animationFrameDuration ?? 120),
                frames: frameTiles.length > 1
                  ? frameTiles.map(({ frame, tile: frameTile }) => {
                      const frameOccurrence = frameTile.sourceOccurrences[0]
                      const frameOverride = tileOverrides[String(frameTile.id)] ?? {}
                      return {
                        sourceX: (frameOccurrence?.x ?? 0) + Number(frameOverride.sourceOffsetX ?? 0) + Number(frame.x ?? 0),
                        sourceY: (frameOccurrence?.y ?? 0) + Number(frameOverride.sourceOffsetY ?? 0) + Number(frame.y ?? 0),
                        width: gridW,
                        height: gridH,
                        blockedColors: frameOverride.blockedColors ?? [],
                        deletedPixels: frameOverride.deletedPixels ?? [],
                      }
                    })
                  : null,
              }
            })
        })
        const response = tileInstructions.length > 0 && file
          ? await addTilesToTileset({ projectId, tilesetId: tileset.id, sourceImage: file, tiles: tileInstructions }).unwrap()
          : null

        const slotByClientId = new Map(response?.addedTiles.map((tile) => [tile.clientId, `${tile.col},${tile.row}`]) ?? [])
        for (const tile of syntheticTiles) {
          if (String(tile.hash).startsWith('existing-')) {
            slotByClientId.set(String(tile.id), slotForTileIndex(tile.index, tileset))
          }
        }
        const existingGroups = (tileset.groups ?? []).filter((group) => {
          const id = String(group.id)
          return group.name !== 'Objects' && group.type !== 'object' && !assignedTerrainGroups.some((assigned) => assigned.id === id)
        }) as Array<Record<string, unknown>>
        const objectsGroup = assignedObjectGroup
          ? {
              id: 'objects',
              name: 'Objects',
              type: 'object',
              system: true,
              metadata: {
                ...assignedObjectGroup.metadata,
                tileType: 'object',
                systemRole: 'objects',
                tileOverrides: stripImportOffsets((assignedObjectGroup.metadata.tileOverrides ?? {}) as Record<string, TileOverride>),
              },
              tiles: assignedObjectGroup.tileRefs.map((ref) => slotByClientId.get(String(ref.tileId))).filter(Boolean),
            }
          : ((tileset.groups ?? []).find((group) => group.name === 'Objects' || group.type === 'object') as Record<string, unknown> | undefined) ?? null
        const nextGroups = [
          ...existingGroups,
          ...assignedTerrainGroups.map((group) => ({
            id: group.id,
            name: group.name,
            type: group.metadata.tileType ?? 'floor',
            solid: Boolean(group.metadata.solid ?? group.metadata.defaultCollision === 'solid'),
            metadata: {
              ...group.metadata,
              tileOverrides: stripImportOffsets((group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>),
            },
            tiles: group.tileRefs.map((ref) => slotByClientId.get(String(ref.tileId))).filter(Boolean),
          })),
          ...(objectsGroup ? [objectsGroup] : []),
        ]

        await updateTilesetGroups({ projectId, tilesetId: tileset.id, groups: nextGroups }).unwrap()
        if (assignedObjectGroup) {
          for (const ref of assignedObjectGroup.tileRefs) {
            const slot = slotByClientId.get(String(ref.tileId))
            if (!slot) continue
            const [colRaw, rowRaw] = slot.split(',')
            const tileIndex = (Number(rowRaw) || 0) * Math.max(1, tileset.columns) + (Number(colRaw) || 0)
            const override = tileOverridesById.get(ref.tileId) ?? {}
            const existingObject = existingObjectTypes.find((objectType) => objectType.tilesetId === tileset.id && objectType.config.visual.tileIndex === tileIndex)
            const draft = objectDrafts.find((candidate) => candidate.id === `object-${ref.tileId}` || candidate.config.visual.tileIndex === tileIndex)
            const objectKind = override.objectKind ?? draft?.config.objectKind ?? existingObject?.config.objectKind ?? 'object'
            const stateDefs = assignedObjectGroup.metadata.stateDefs as ObjectStateDraftDef[] | undefined
            const stateTransitions = assignedObjectGroup.metadata.stateTransitions as ObjectStateTransitionDraft[] | undefined
            const body = {
              name: existingObject?.name ?? `Object ${tileIndex}`,
              category: objectKind === 'door'
                ? 'interactive'
                : (override.objectCategory as ObjectTypeDraft['category'] | undefined) ?? existingObject?.category ?? 'decoration',
              tilesetId: tileset.id,
              spanX: existingObject?.spanX ?? 1,
              spanY: existingObject?.spanY ?? 1,
              config: {
                visual: { tileIndex, spanX: existingObject?.spanX ?? 1, spanY: existingObject?.spanY ?? 1 },
                objectKind,
                defaultSolid: objectKind === 'door' ? true : override.solid ?? Boolean(assignedObjectGroup.metadata.solid ?? assignedObjectGroup.metadata.defaultCollision === 'solid'),
                ...(draft?.config.animation ? { animation: draft.config.animation } : {}),
                ...(draft?.config.states ? { states: draft.config.states } : {}),
                ...(draft?.config.defaultState ? { defaultState: draft.config.defaultState } : {}),
                ...(assignedObjectGroup.metadata.isStateful ? { isStateful: true } : {}),
                ...(stateDefs ? { stateDefs } : {}),
                ...(stateTransitions ? { stateTransitions } : {}),
              },
            }
            if (existingObject) {
              await updateObjectType({ id: existingObject.id, projectId, body }).unwrap()
            } else {
              await createObjectType({ projectId, body }).unwrap()
            }
          }
        }
        importedTilesetId = tileset.id
      }

      onImported(importedTilesetId ?? targetTileset?.id ?? availableTilesets[0]?.id ?? 0)
      onClose()
    } catch (saveError) {
      if (isAuthFailure(saveError)) return
      setError(getMessage(saveError))
    }
  }

  const handleAddGroup = () => {
    const normalizedName = newGroupName.trim()
    if (!normalizedName) return
    const nextGroup: GroupDraft = {
      id: crypto.randomUUID(),
      name: normalizedName,
      type: 'environment',
      tileRefs: [],
      metadata: { width: 1, height: 1, tileType: 'floor' as TileType, solid: false, defaultCollision: 'none', collisionBehavior: 'group' },
    }
    setGroups((current) => {
      return [...current, nextGroup]
    })
    setActiveGroupId(nextGroup.id)
    setNewGroupName('')
    setIsCreatingGroup(false)
  }

  const handleCreateLocalGroup = useCallback((id: string, name: string, tileType: TileType | 'object', width: number, height: number) => {
    const normalizedName = name.trim()
    if (!normalizedName) return
    const effectiveTileType = selectedDestinationIsObjectTileset ? 'object' : tileType
    const solid = effectiveTileType === 'wall' || effectiveTileType === 'object'
    const nextGroup: GroupDraft = {
      id,
      name: normalizedName,
      type: 'environment',
      tileRefs: [],
      metadata: {
        width: Math.max(1, width),
        height: Math.max(1, height),
        tileType: effectiveTileType,
        solid,
        defaultCollision: solid ? 'solid' : 'none',
        collisionBehavior: 'group',
      },
    }
    setGroups((current) => {
      return [...current, nextGroup]
    })
    setActiveGroupId(nextGroup.id)
    setSelectedLayoutTileId(null)
  }, [selectedDestinationIsObjectTileset])

  const groupDraftsToServerGroups = useCallback((drafts: GroupDraft[], tileset: Tileset) => drafts.map((group, orderIndex) => {
    const isObjectTileset = tilesetKind(tileset) === 'object'
    const tileOverrides = stripImportOffsets((group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)
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
        tileOverrides,
      },
      tileRefs: group.tileRefs,
      tiles: group.tileRefs
        .map((ref) => {
          const tile = syntheticTiles.find((candidate) => candidate.id === ref.tileId)
          return tile ? slotForTileIndex(tile.index, tileset) : null
        })
        .filter((slot): slot is string => slot != null),
    }
  }), [syntheticTiles])

  const persistGroups = useCallback((nextGroups: GroupDraft[]) => {
    const tileset = selectedDestinationTileset
    if (!tileset) return
    void updateTilesetGroups({
      projectId,
      tilesetId: tileset.id,
      groups: groupDraftsToServerGroups(nextGroups, tileset),
    }).unwrap().catch((persistError) => {
      if (isAuthFailure(persistError)) return
      setError(getMessage(persistError))
    })
  }, [getMessage, groupDraftsToServerGroups, isAuthFailure, projectId, selectedDestinationTileset, updateTilesetGroups])

  const handleDeleteGroup = (groupId: string) => {
    if (groupId === OBJECTS_GROUP_ID) return
    setGroups((current) => {
      const next = current.filter((group) => group.id !== groupId)
      persistGroups(next)
      return next
    })
    setActiveGroupId((current) => (current === groupId ? null : current))
    setSelectedLayoutTileId(null)
  }

  const handleAssignSelectedToGroup = () => {
    if (!activeGroup || organizeSelectedTileIds.length === 0) return
    setGroups((current) =>
      current.map((group) => (group.id !== activeGroup.id ? group : applyTilesToLayout(group, organizeSelectedTileIds))),
    )
    setOrganizeSelectedTileIds([])
  }

  const handleRemoveTileFromGroup = (tileId: number) => {
    if (!activeGroup) return
    setGroups((current) => {
      const next = current.map((group) => (
        group.id !== activeGroup.id
          ? group
          : normalizeLayout({ ...group, tileRefs: group.tileRefs.filter((ref) => ref.tileId !== tileId) })
      ))
      persistGroups(next)
      return next
    })
    setSelectedLayoutTileId((current) => (current === tileId ? null : current))
  }

  const cleanAnimationRefs = (overrides: Record<string, TileOverride>, removedTileId: number) => {
    const nextOverrides: Record<string, TileOverride> = {}
    for (const [key, override] of Object.entries(overrides)) {
      if (Number(key) === removedTileId) continue
      nextOverrides[key] = {
        ...override,
        animationFrames: override.animationFrames?.filter((frame, index) => index === 0 || frame.tileId !== removedTileId),
        animationFrameTileIds: override.animationFrameTileIds?.filter((tileId) => tileId !== removedTileId),
      }
    }
    return nextOverrides
  }

  const appendTileToGroup = (group: GroupDraft, tileId: number, sourceOverride?: TileOverride) => {
    if (group.tileRefs.some((ref) => ref.tileId === tileId)) return group
    const width = Math.max(1, Number(group.metadata.width ?? 1))
    const nextIndex = group.tileRefs.length
    const nextHeight = Math.max(Number(group.metadata.height ?? 1), Math.floor(nextIndex / width) + 1)
    const overrides = { ...((group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>) }
    if (sourceOverride) {
      overrides[String(tileId)] = structuredClone(sourceOverride)
    }
    return {
      ...group,
      tileRefs: [...group.tileRefs, { tileId, x: nextIndex % width, y: Math.floor(nextIndex / width) }],
      metadata: { ...group.metadata, height: nextHeight, tileOverrides: overrides },
    }
  }

  const removeTileFromGroupDraft = (group: GroupDraft, tileId: number) => {
    const overrides = cleanAnimationRefs((group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>, tileId)
    const width = Math.max(1, Number(group.metadata.width ?? 1))
    const remainingIds = group.tileRefs.filter((ref) => ref.tileId !== tileId).map((ref) => ref.tileId)
    const nextRefs = remainingIds.map((id, index) => ({ tileId: id, x: index % width, y: Math.floor(index / width) }))
    const nextHeight = Math.max(1, Math.ceil(nextRefs.length / width))
    return {
      ...group,
      tileRefs: nextRefs,
      metadata: { ...group.metadata, height: nextHeight, tileOverrides: overrides },
    }
  }

  const handleMoveTileToGroup = (tileId: number, sourceGroupId: string, targetGroupId: string) => {
    setGroups((current) => {
      const sourceGroup = current.find((group) => group.id === sourceGroupId)
      const sourceOverride = sourceGroup ? ((sourceGroup.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)[String(tileId)] : undefined
      const next = current.map((group) => {
        if (group.id === sourceGroupId) return removeTileFromGroupDraft(group, tileId)
        if (group.id === targetGroupId) return appendTileToGroup(group, tileId, sourceOverride)
        return group
      })
      persistGroups(next)
      return next
    })
    setSelectedLayoutTileId((current) => (current === tileId ? null : current))
  }

  const handleMoveTileToTilesetGroup = (tileId: number, sourceGroupId: string, targetTilesetId: number, targetGroupId: string) => {
    const sourceTileset = selectedDestinationTileset
    const tile = syntheticTiles.find((candidate) => candidate.id === tileId)
    if (!sourceTileset || !tile) return
    const [colRaw, rowRaw] = slotForTileIndex(tile.index, sourceTileset).split(',')
    setGroups((current) => {
      const next = current.map((group) => (group.id === sourceGroupId ? removeTileFromGroupDraft(group, tileId) : group))
      return next
    })
    setSelectedLayoutTileId((current) => (current === tileId ? null : current))
    void moveTileToTilesetGroup({
      projectId,
      sourceTilesetId: sourceTileset.id,
      sourceGroupId,
      col: Number(colRaw) || 0,
      row: Number(rowRaw) || 0,
      targetTilesetId,
      targetGroupId,
      duplicate: false,
    }).unwrap().catch((moveError) => {
      if (isAuthFailure(moveError)) return
      setError(getMessage(moveError))
      seedTilesetDraft(sourceTileset)
    })
  }

  const handleDuplicateTileToGroup = (tileId: number, sourceGroupId: string, targetGroupId: string) => {
    setGroups((current) => {
      const sourceGroup = current.find((group) => group.id === sourceGroupId)
      const sourceOverride = sourceGroup ? ((sourceGroup.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)[String(tileId)] : undefined
      const next = current.map((group) => (group.id === targetGroupId ? appendTileToGroup(group, tileId, sourceOverride) : group))
      persistGroups(next)
      return next
    })
  }

  const handleRemoveTileFromSpecificGroup = (tileId: number, groupId: string) => {
    setGroups((current) => {
      const next = current.map((group) => (group.id === groupId ? removeTileFromGroupDraft(group, tileId) : group))
      persistGroups(next)
      return next
    })
    setSelectedLayoutTileId((current) => (current === tileId ? null : current))
  }

  const handleToggleSourceRegion = useCallback((regions: Array<{ sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }>) => {
    const tileIds: number[] = []
    setSyntheticTiles((current) => {
      let nextTiles = current
      let nextId = current.reduce((max, tile) => Math.max(max, tile.id), 0) + 1
      for (const region of regions) {
        const existing = nextTiles.find((tile) =>
          tile.sourceOccurrences[0]?.x === region.sourceX &&
          tile.sourceOccurrences[0]?.y === region.sourceY &&
          tile.imageUrl === region.imageUrl,
        )
        if (existing) {
          tileIds.push(existing.id)
          continue
        }
        const created = {
          id: nextId,
          index: nextId - 1,
          hash: `source-${region.sourceX}-${region.sourceY}-${region.width}-${region.height}`,
          imageUrl: region.imageUrl,
          sourceOccurrences: [{ x: region.sourceX, y: region.sourceY }],
        }
        tileIds.push(nextId)
        nextTiles = [...nextTiles, created]
        nextId += 1
      }
      return nextTiles
    })
    window.setTimeout(() => {
      setApprovedTileIds((current) => Array.from(new Set([...current, ...tileIds])))
      setOrganizeSelectedTileIds((current) => arraysEqual(current, tileIds) ? [] : tileIds)
    }, 0)
  }, [])

  const handleAssignSourceRegionsToActiveGroup = useCallback((regions: Array<{ sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }>) => {
    if (!activeGroupId || regions.length === 0) return []
    const tileIds: number[] = []
    const createdTiles: ExtractedTile[] = []
    setSyntheticTiles((current) => {
      let nextTiles = current
      let nextId = current.reduce((max, tile) => Math.max(max, tile.id), 0) + 1
      for (const region of regions) {
        const existing = nextTiles.find((tile) =>
          tile.sourceOccurrences[0]?.x === region.sourceX &&
          tile.sourceOccurrences[0]?.y === region.sourceY &&
          tile.imageUrl === region.imageUrl,
        )
        if (existing) {
          tileIds.push(existing.id)
          createdTiles.push(existing)
          continue
        }
        const created: ExtractedTile = {
          id: nextId,
          index: nextId - 1,
          hash: `source-${region.sourceX}-${region.sourceY}-${region.width}-${region.height}`,
          imageUrl: region.imageUrl,
          sourceOccurrences: [{ x: region.sourceX, y: region.sourceY }],
        }
        tileIds.push(created.id)
        createdTiles.push(created)
        nextTiles = [...nextTiles, created]
        nextId += 1
      }
      return nextTiles
    })
    window.setTimeout(() => {
      setApprovedTileIds((current) => Array.from(new Set([...current, ...tileIds])))
      setGroups((current) => current.map((group) => (group.id === activeGroupId ? applyTilesToLayout(group, tileIds) : group)))
      setOrganizeSelectedTileIds([])
      setSelectedLayoutTileId(tileIds[0] ?? null)
    }, 0)
    return createdTiles
  }, [activeGroupId])

  const handleCreateSourceRegionTile = useCallback((region: { sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }) => {
    let resolvedTile: ExtractedTile | null = null
    setSyntheticTiles((current) => {
      const existing = current.find((tile) =>
        tile.sourceOccurrences[0]?.x === region.sourceX &&
        tile.sourceOccurrences[0]?.y === region.sourceY &&
        tile.imageUrl === region.imageUrl,
      )
      if (existing) {
        resolvedTile = existing
        return current
      }

      const nextId = current.reduce((max, tile) => Math.max(max, tile.id), 0) + 1
      const created: ExtractedTile = {
        id: nextId,
        index: nextId - 1,
        hash: `source-${region.sourceX}-${region.sourceY}-${region.width}-${region.height}`,
        imageUrl: region.imageUrl,
        sourceOccurrences: [{ x: region.sourceX, y: region.sourceY }],
      }
      resolvedTile = created
      return [...current, created]
    })
    if (!resolvedTile) {
      throw new Error('Could not create source tile for animation frame.')
    }
    setApprovedTileIds((current) => Array.from(new Set([...current, resolvedTile!.id])))
    return resolvedTile
  }, [])

  const handleMoveLayoutItem = (source: { tileId: number | null; x: number; y: number }, target: { tileId: number | null; x: number; y: number }) => {
    if (!activeGroup) return
    setGroups((current) => {
      const next = current.map((group) => (group.id !== activeGroup.id ? group : moveLayoutItem(group, source, target)))
      persistGroups(next)
      return next
    })
  }

  const handleUpdateGroupDimension = (groupId: string, key: 'width' | 'height', value: number) => {
    setGroups((current) => {
      const next = current.map((group) => (
        group.id !== groupId ? group : normalizeLayout({ ...group, metadata: { ...group.metadata, [key]: Math.max(1, value) } })
      ))
      persistGroups(next)
      return next
    })
  }

  const handleUpdateGroupMeta = (groupId: string, key: string, value: unknown) => {
    setGroups((current) => {
      const next = current.map((group) => {
        if (group.id !== groupId) return group
        if (key === 'name') return { ...group, name: String(value) }
        if (key === 'defaultCollision') {
          const defaultCollision = String(value)
          return { ...group, metadata: { ...group.metadata, defaultCollision, solid: defaultCollision === 'solid' } }
        }
        return { ...group, metadata: { ...group.metadata, [key]: value } }
      })
      persistGroups(next)
      return next
    })
  }

  const handleUpdateGroupTileType = (groupId: string, tileType: TileType) => {
    setGroups((current) => {
      const next = current.map((group) => {
        if (group.id !== groupId) return group
        const solid = tileType === 'wall' || tileType === 'object'
        return { ...group, metadata: { ...group.metadata, tileType, solid, defaultCollision: solid ? 'solid' : 'none' } }
      })
      persistGroups(next)
      return next
    })
  }

  const handleUpdateTileOverride = (tileId: number, groupId: string, updates: Partial<TileOverride>) => {
    let mergedOverride: TileOverride | null = null
    setGroups((current) => {
      const next = current.map((group) => {
        if (group.id !== groupId) return group
        const overrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
        const existing = overrides[String(tileId)] ?? {}
        mergedOverride = { ...existing, ...updates }
        return { ...group, metadata: { ...group.metadata, tileOverrides: { ...overrides, [String(tileId)]: mergedOverride } } }
      })
      persistGroups(next)
      return next
    })
    if (
      'blockedColors' in updates ||
      'deletedPixels' in updates ||
      'sourceOffsetX' in updates ||
      'sourceOffsetY' in updates ||
      'animationFrames' in updates ||
      'animationFrameTileIds' in updates ||
      'animationFrameDuration' in updates
    ) {
      pendingRestitchTileIdsRef.current.add(tileId)
      setRestitchRevision((current) => current + 1)
    }
  }

  const handleAppendAnimationFrame = (baseTileId: number, groupId: string, frame: AnimationFrameRef) => {
    setGroups((current) => {
      const next = current.map((group) => {
        if (group.id !== groupId) return group
        const overrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
        const existing = overrides[String(baseTileId)] ?? {}
        const baseTile = syntheticTiles.find((candidate) => candidate.id === baseTileId) ?? null
        const currentFrames = baseTile
          ? resolveAnimationFrames(baseTile, existing, syntheticTiles)
          : existing.animationFrames ?? []
        const baseFrame: AnimationFrameRef | null = baseTile
          ? { tileId: baseTile.id, tileIndex: baseTile.index, x: currentFrames[0]?.x ?? 0, y: currentFrames[0]?.y ?? 0 }
          : null
        const frames = [
          ...(currentFrames.length > 0 ? currentFrames : baseFrame ? [baseFrame] : []),
          frame,
        ]
        const mergedOverride: TileOverride = {
          ...existing,
          animationFrames: frames,
          animationFrameTileIds: frames.map((candidate) => candidate.tileId),
          animationFrameDuration: Number(existing.animationFrameDuration ?? 120),
          animationLoop: true,
        }
        return { ...group, metadata: { ...group.metadata, tileOverrides: { ...overrides, [String(baseTileId)]: mergedOverride } } }
      })
      persistGroups(next)
      return next
    })
    pendingRestitchTileIdsRef.current.add(baseTileId)
    setRestitchRevision((current) => current + 1)
  }

  const handleClearTileOverride = (tileId: number, groupId: string) => {
    setGroups((current) => {
      const next = current.map((group) => {
        if (group.id !== groupId) return group
        const rest = { ...((group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>) }
        delete rest[String(tileId)]
        return { ...group, metadata: { ...group.metadata, tileOverrides: rest } }
      })
      persistGroups(next)
      return next
    })
  }

  const restitchTileFromOverride = useCallback((tileId: number, override: TileOverride) => {
    const tileset = selectedDestinationTileset
    const tile = syntheticTiles.find((candidate) => candidate.id === tileId)
    const occurrence = tile?.sourceOccurrences[0]
    if (!tileset || !tile || !occurrence) return
    const [colRaw, rowRaw] = slotForTileIndex(tile.index, tileset).split(',')
    const frames = resolveAnimationFrames(tile, override, syntheticTiles)
    void createFilteredAnimationBlob({
      frames,
      tiles: syntheticTiles,
      tileOverrides: tileOverridesForFrames(groups),
      sourceFile: file,
      width: gridW,
      height: gridH,
    }).then((sourceImage) => {
      if (!sourceImage) return undefined
      return restitchTile({
        projectId,
        tilesetId: tileset.id,
        col: Number(colRaw) || 0,
        row: Number(rowRaw) || 0,
        sourceImage,
        tile: {
          clientId: String(tile.id),
          sourceX: 0,
          sourceY: 0,
          width: gridW,
          height: gridH,
          blockedColors: [],
          deletedPixels: [],
          animated: frames.length > 1,
          frameDuration: Number(override.animationFrameDuration ?? 120),
          frames: frames.length > 1
            ? frames.map((_frame, index) => ({
                sourceX: index * gridW,
                sourceY: 0,
                width: gridW,
                height: gridH,
                blockedColors: [],
                deletedPixels: [],
              }))
            : null,
        },
      }).unwrap().then((updatedTileset) => {
        setSyntheticTiles((current) => current.map((candidate) => (
          candidate.id === tileId
            ? { ...candidate, imageUrl: updatedTileset.imageUrl }
            : candidate
        )))
      })
    }).catch((persistError) => {
      if (isAuthFailure(persistError)) return
      setError(getMessage(persistError))
    })
  }, [file, getMessage, gridH, gridW, groups, isAuthFailure, projectId, restitchTile, selectedDestinationTileset, syntheticTiles])

  useEffect(() => {
    if (pendingRestitchTileIdsRef.current.size === 0) return
    const pendingIds = Array.from(pendingRestitchTileIdsRef.current)
    pendingRestitchTileIdsRef.current.clear()
    for (const tileId of pendingIds) {
      const group = groups.find((candidate) => candidate.tileRefs.some((ref) => ref.tileId === tileId))
      const override = group ? ((group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)[String(tileId)] : undefined
      const tile = syntheticTiles.find((candidate) => candidate.id === tileId) ?? null
      if (!override || !tile) continue
      if (!animationFrameTilesReady(tile, override, syntheticTiles)) {
        pendingRestitchTileIdsRef.current.add(tileId)
        continue
      }
      restitchTileFromOverride(tileId, override)
    }
  }, [groups, restitchRevision, restitchTileFromOverride, syntheticTiles])

  useEffect(() => {
    if (!open || !selectedDestinationTileset) return
    for (const group of groups) {
      const overrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
      for (const [tileIdRaw, override] of Object.entries(overrides)) {
        if ((override.blockedColors?.length ?? 0) === 0 && (override.deletedPixels?.length ?? 0) === 0) continue
        const key = `${selectedDestinationTileset.id}:${tileIdRaw}:${JSON.stringify(override.blockedColors ?? [])}:${JSON.stringify(override.deletedPixels ?? [])}`
        if (restitchedFilterKeysRef.current.has(key)) continue
        const tileId = Number(tileIdRaw)
        if (!syntheticTiles.some((tile) => tile.id === tileId && String(tile.hash).startsWith('existing-'))) continue
        restitchedFilterKeysRef.current.add(key)
        restitchTileFromOverride(tileId, override)
      }
    }
  }, [groups, open, restitchTileFromOverride, selectedDestinationTileset, syntheticTiles])

  const handleCommitAssignedTileSlot = useCallback((tileId: number, slot: string, tileset: Tileset) => {
    const [colRaw, rowRaw] = slot.split(',')
    const col = Number(colRaw) || 0
    const row = Number(rowRaw) || 0
    const tileIndex = row * Math.max(1, tileset.columns) + col
    setSyntheticTiles((current) => current.map((tile) => (tile.id === tileId ? { ...tile, index: tileIndex } : tile)))
    setGroups((current) => current.map((group) => {
      const overrides = (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>
      const existing = overrides[String(tileId)]
      if (!existing) return group
      return {
        ...group,
        metadata: {
          ...group.metadata,
          tileOverrides: {
            ...overrides,
            [String(tileId)]: stripImportOffsets({ [String(tileId)]: existing })[String(tileId)],
          },
        },
      }
    }))
  }, [])

  const handleSetActiveGroupId = (groupId: string | null) => {
    setActiveGroupId(groupId)
    setSelectedLayoutTileId(null)
    setOrganizeSelectedTileIds([])
  }

  const handleToggleTile = (tileId: number) => {
    setOrganizeSelectedTileIds((current) => (current.length === 1 && current[0] === tileId ? [] : [tileId]))
  }

  const goBack = () => setStep((current) => Math.max(0, current - 1))

  return {
    // Navigation
    step,
    goBack,
    // Error
    error,
    // Loading
    isAddingTiles,
    isUpdatingGroups,
    // Can-advance
    canAdvanceFromExtract,
    canAdvanceFromOrganize,
    canFinishComposedImport,
    // Step actions
    handleUpload,
    handleSave,
    handleDone,
    syncObjectDrafts,
    // Extract step (step 0)
    assetName,
    setAssetName,
    file,
    setFile,
    imageUrl,
    imageSize,
    selectedDestinationTilesetId,
    setSelectedDestinationTilesetId: handleSelectDestinationTileset,
    targetTileset,
    // Organize step (step 1)
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
    handleAssignSourceRegionsToActiveGroup,
    handleCreateSourceRegionTile,
    // Review step (step 2)
    objectDrafts,
    importSession,
  }
}

function arraysEqual(left: number[], right: number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function tilesetKind(tileset: Tileset): 'background' | 'object' {
  return (tileset.type ?? tileset.metadata?.type) === 'object' ? 'object' : 'background'
}

function resolveAnimationFrames(baseTile: ExtractedTile, override: TileOverride, tiles: ExtractedTile[]): AnimationFrameRef[] {
  const baseFrame: AnimationFrameRef = { tileId: baseTile.id, tileIndex: baseTile.index, x: 0, y: 0 }
  if (override.animationFrames?.length) {
    return override.animationFrames[0]?.tileId === baseTile.id
      ? override.animationFrames
      : [baseFrame, ...override.animationFrames.filter((frame) => frame.tileId !== baseTile.id)]
  }
  const frameIds = override.animationFrameTileIds?.length
    ? [baseTile.id, ...override.animationFrameTileIds.filter((tileId) => tileId !== baseTile.id)]
    : [baseTile.id]
  return frameIds
    .map((tileId) => {
      const tile = tiles.find((candidate) => candidate.id === tileId)
      return tile ? { tileId, tileIndex: tile.index, x: 0, y: 0 } : null
    })
    .filter((frame): frame is AnimationFrameRef => frame != null)
}

function animationFrameTilesReady(baseTile: ExtractedTile, override: TileOverride, tiles: ExtractedTile[]): boolean {
  const frames = resolveAnimationFrames(baseTile, override, tiles)
  const expectedFrameCount = override.animationFrames?.length ?? override.animationFrameTileIds?.length ?? frames.length
  if (frames.length < expectedFrameCount) return false
  return frames.every((frame) => tiles.some((tile) => tile.id === frame.tileId))
}

function tileOverridesForFrames(groups: GroupDraft[]): Record<string, TileOverride> {
  const overrides: Record<string, TileOverride> = {}
  for (const group of groups) {
    Object.assign(overrides, (group.metadata.tileOverrides ?? {}) as Record<string, TileOverride>)
  }
  return overrides
}

async function createFilteredAnimationBlob({
  frames,
  tiles,
  tileOverrides,
  sourceFile,
  width,
  height,
}: {
  frames: AnimationFrameRef[]
  tiles: ExtractedTile[]
  tileOverrides: Record<string, TileOverride>
  sourceFile: File | null
  width: number
  height: number
}): Promise<Blob | null> {
  if (frames.length === 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = width * frames.length
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const renderCtx = ctx
  renderCtx.imageSmoothingEnabled = false
  renderCtx.clearRect(0, 0, canvas.width, canvas.height)

  const sourceFileUrl = sourceFile ? URL.createObjectURL(sourceFile) : null
  const imageCache = new Map<string, HTMLImageElement>()
  try {
    for (const [index, frame] of frames.entries()) {
      const tile = tiles.find((candidate) => candidate.id === frame.tileId)
      if (!tile) continue
      await drawFrame(frame, index, tile)
    }
  } finally {
    if (sourceFileUrl) URL.revokeObjectURL(sourceFileUrl)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png')
  })

  async function drawFrame(frame: AnimationFrameRef, index: number, tile: ExtractedTile): Promise<void> {
    const tileOverride = tileOverrides[String(tile.id)] ?? {}
    const isExistingTile = String(tile.hash).startsWith('existing-')
    const sourceUrl = isExistingTile ? `${tile.imageUrl}?v=${Date.now()}` : sourceFileUrl
    if (!sourceUrl) return
    const image = imageCache.get(sourceUrl) ?? await loadImage(sourceUrl)
    imageCache.set(sourceUrl, image)
    const occurrence = tile.sourceOccurrences[0]
    const sourceX = (occurrence?.x ?? 0) + (isExistingTile ? 0 : Number(tileOverride.sourceOffsetX ?? 0)) + Number(frame.x ?? 0)
    const sourceY = (occurrence?.y ?? 0) + (isExistingTile ? 0 : Number(tileOverride.sourceOffsetY ?? 0)) + Number(frame.y ?? 0)
    const destX = index * width
    renderCtx.drawImage(image, sourceX, sourceY, width, height, destX, 0, width, height)
    applyPixelFilters(renderCtx, destX, 0, width, height, tileOverride.blockedColors ?? [], tileOverride.deletedPixels ?? [])
  }

  function applyPixelFilters(
    targetCtx: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    frameWidth: number,
    frameHeight: number,
    blockedColors: string[],
    deletedPixels: string[],
  ) {
    if (blockedColors.length === 0 && deletedPixels.length === 0) return
    const imageData = targetCtx.getImageData(offsetX, offsetY, frameWidth, frameHeight)
    const blocked = new Set(blockedColors.map(normalizeColorHex).filter((color): color is string => Boolean(color)))
    const deleted = new Set(deletedPixels)
    for (let y = 0; y < frameHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const offset = (y * frameWidth + x) * 4
        const color = rgbToHex(imageData.data[offset], imageData.data[offset + 1], imageData.data[offset + 2])
        if (deleted.has(`${x},${y}`) || blocked.has(color)) {
          imageData.data[offset + 3] = 0
        }
      }
    }
    targetCtx.putImageData(imageData, offsetX, offsetY)
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load tile image.'))
    image.src = src
  })
}

function normalizeColorHex(color: string) {
  const value = color.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(value)) return value
  if (/^[0-9a-f]{6}$/.test(value)) return `#${value}`
  return null
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}
