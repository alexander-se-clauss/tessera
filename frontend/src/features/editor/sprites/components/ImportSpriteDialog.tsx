import CheckIcon from '@mui/icons-material/Check'
import {
  Alert,
  Box,
  Button,
} from '@mui/material'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx, dialogSecondaryButtonSx } from '../../components/AppDialog'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tileset, TilesetRequest } from '../../model/types'
import type { SpriteFrame, SpriteState } from '../types/sprite'
import type { SelectionMode } from '../hooks/useFrameSelection'
import { useCreateTilesetMutation, useUpdateTilesetMutation } from '../../api/editorApi'
import PresetPicker from './PresetPicker'
import { UploadStep } from './steps/UploadStep'
import { StatesStep } from './steps/StatesStep'
import { ConfirmStep } from './steps/ConfirmStep'

const STEPS = ['Upload', 'States', 'Confirm']
type StepIndicatorProps = {
  step: number
}

function StepIndicator({ step }: StepIndicatorProps) {
  return (
    <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'none' }}>
      {STEPS.map((label, i) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              transition: 'all 200ms ease',
              ...(i < step
                ? { bgcolor: 'rgba(56,139,253,0.15)', border: '1px solid rgba(56,139,253,0.32)', color: '#5d9eff' }
                : i === step
                ? { bgcolor: 'rgba(93,158,255,0.14)', border: '1px solid rgba(93,158,255,0.38)', color: '#79b8ff' }
                : { bgcolor: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.2)' }),
            }}
          >
            {i < step ? <CheckIcon sx={{ fontSize: 10, color: '#5d9eff' }} /> : i + 1}
          </Box>
          <Box
            sx={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: i === step ? '100px' : '0px',
              opacity: i === step ? 1 : 0,
              pl: i === step ? 0.75 : 0,
              transition: 'max-width 250ms ease, opacity 250ms ease',
            }}
          >
            <Box component="span" sx={{ fontSize: 11, fontWeight: 500, color: '#8b949e', letterSpacing: '0.04em' }}>
              {label}
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
        return
      }
      reject(new Error('Failed to read sprite image.'))
    }
    reader.onerror = () => reject(new Error('Failed to read sprite image.'))
    reader.readAsDataURL(file)
  })
}

type ImportSpriteDialogProps = {
  open: boolean
  projectId: number
  projectName: string
  editingSprite?: Tileset | null
  onClose: () => void
  onImported: (spriteId: number) => void
}

function makeInitialStates(): SpriteState[] {
  return [{ id: crypto.randomUUID(), name: 'idle', tag: 'idle', frames: [] }]
}

export function ImportSpriteDialog({
  open, projectId, projectName, editingSprite = null, onClose, onImported,
}: ImportSpriteDialogProps) {
  const isEditing = Boolean(editingSprite)
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [spriteName, setSpriteName] = useState('')
  const [baseFrameWidth, setBaseFrameWidth] = useState(16)
  const [baseFrameHeight, setBaseFrameHeight] = useState(16)
  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })

  const columns = Math.max(1, Math.floor(imageSize.width / baseFrameWidth))
  const rows = Math.max(1, Math.floor(imageSize.height / baseFrameHeight))

  const [states, setStates] = useState<SpriteState[]>(makeInitialStates)
  const [activeStateId, setActiveStateId] = useState<string>(states[0].id)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('single')
  const [pickerAnchorEl, setPickerAnchorEl] = useState<HTMLElement | null>(null)
  const [blockedColors, setBlockedColors] = useState<string[]>([])
  const [createTileset] = useCreateTilesetMutation()
  const [updateTileset] = useUpdateTilesetMutation()

  const frameIndexByStateRef = useRef<Record<string, number>>({})
  const imageUrlRef = useRef('')
  const [frameIndexSnapshot, setFrameIndexSnapshot] = useState<Record<string, number>>({})

  useEffect(() => {
    imageUrlRef.current = imageUrl
  }, [imageUrl])

  const handleCurrentFrameIndexChange = (stateId: string, index: number) => {
    frameIndexByStateRef.current[stateId] = index
  }

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current)
      setStep(0)
      setError(null)
      setIsAdvancing(false)
      setIsSaving(false)
      setSpriteName('')
      setBaseFrameWidth(16)
      setBaseFrameHeight(16)
      setFile(null)
      setImageUrl('')
      setImageSize({ width: 0, height: 0 })
      const initial = makeInitialStates()
      setStates(initial)
      setActiveStateId(initial[0].id)
      setSelectionMode('single')
      setPickerAnchorEl(null)
      setBlockedColors([])
      frameIndexByStateRef.current = {}
      setFrameIndexSnapshot({})
    }
  }, [open])

  useEffect(() => {
    if (!open || !editingSprite) {
      return
    }

    const metadata = (editingSprite.metadata ?? {}) as Record<string, unknown>
    const nextStates = Array.isArray(metadata.states) && metadata.states.length > 0
      ? metadata.states as SpriteState[]
      : makeInitialStates()
    const nextBaseFrameWidth = Number(metadata.baseFrameWidth ?? editingSprite.tileWidth ?? 16)
    const nextBaseFrameHeight = Number(metadata.baseFrameHeight ?? editingSprite.tileHeight ?? 16)
    const nextBlockedColors = Array.isArray(metadata.blockedColors)
      ? metadata.blockedColors.filter((value): value is string => typeof value === 'string')
      : []

    setStep(1)
    setError(null)
    setSpriteName(editingSprite.name)
    setBaseFrameWidth(nextBaseFrameWidth)
    setBaseFrameHeight(nextBaseFrameHeight)
    setFile(null)
    setImageUrl(editingSprite.imageUrl)
    setImageSize({
      width: editingSprite.columns * nextBaseFrameWidth,
      height: editingSprite.rows * nextBaseFrameHeight,
    })
    setStates(nextStates)
    setActiveStateId(nextStates[0]?.id ?? '')
    setSelectionMode('single')
    setPickerAnchorEl(null)
    setBlockedColors(nextBlockedColors)
    frameIndexByStateRef.current = {}
    setFrameIndexSnapshot({})
  }, [editingSprite, open])

  useEffect(() => {
    if (!open) { return }
    if (!file) {
      if (!editingSprite || imageUrlRef.current !== editingSprite.imageUrl) {
        if (imageUrlRef.current) { URL.revokeObjectURL(imageUrlRef.current) }
        setImageUrl(editingSprite?.imageUrl ?? '')
        if (!editingSprite) {
          setImageSize({ width: 0, height: 0 })
        }
      }
      return
    }
    let cancelled = false
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (cancelled) { URL.revokeObjectURL(objectUrl); return }
      if (imageUrlRef.current) { URL.revokeObjectURL(imageUrlRef.current) }
      setImageSize({ width: image.naturalWidth, height: image.naturalHeight })
      setImageUrl(objectUrl)
    }
    image.onerror = () => {
      if (!cancelled) { URL.revokeObjectURL(objectUrl); setError('Failed to load image. Make sure it is a valid PNG.') }
    }
    image.src = objectUrl
    return () => { cancelled = true }
  }, [editingSprite, file, open])

  const canAdvanceStep1 = spriteName.trim() !== '' && baseFrameWidth > 0 && baseFrameHeight > 0 && (!!file || isEditing)

  const validationErrors = useMemo<Map<string, string>>(() => {
    const errors = new Map<string, string>()
    const names = new Set<string>()
    for (const state of states) {
      if (!state.name.trim()) { errors.set(state.id, 'Name is empty'); continue }
      if (names.has(state.name)) { errors.set(state.id, 'Duplicate name') } else { names.add(state.name) }
      if (state.frames.length === 0) { errors.set(state.id, (errors.get(state.id) ?? '') + ' No frames') }
    }
    return errors
  }, [states])

  const idleState = states.find((s) => s.name === 'idle')
  const canAdvanceStep2 =
    idleState !== undefined && idleState.frames.length > 0 &&
    states.every((s) => s.frames.length > 0 && s.name.trim() !== '') &&
    validationErrors.size === 0

  const handleAdvanceFromStep1 = async () => {
    if (!canAdvanceStep1 || !imageUrl) return
    setIsAdvancing(true)
    setError(null)
    try { setStep(1) } catch { setError('Failed to load image. Make sure it is a valid PNG.') }
    finally { setIsAdvancing(false) }
  }

  const handleAddBlockedColor = (color: string) => {
    setBlockedColors((prev) => (prev.includes(color) ? prev : [...prev, color]))
  }
  const handleRemoveBlockedColor = (color: string) => {
    setBlockedColors((prev) => prev.filter((c) => c !== color))
  }

  const handleSave = async () => {
    if (!file && !editingSprite) {
      setError('Sprite PNG is missing.')
      return
    }
    try {
      setIsSaving(true)
      setError(null)
      const imageUrl = file ? await fileToDataUrl(file) : editingSprite?.imageUrl
      if (!imageUrl) {
        setError('Sprite PNG is missing.')
        return
      }

      const payload: TilesetRequest = {
        name: spriteName,
        imageUrl,
        assetType: 'character',
        tileWidth: baseFrameWidth,
        tileHeight: baseFrameHeight,
        columns,
        rows,
        margin: 0,
        spacing: 0,
        metadata: {
          kind: 'sprite',
          states,
          blockedColors,
          baseFrameWidth,
          baseFrameHeight,
        },
      }

      const sprite = editingSprite
        ? await updateTileset({ tilesetId: editingSprite.id, body: payload }).unwrap()
        : await createTileset({ projectId, body: payload }).unwrap()
      onImported(sprite.id)
      onClose()
    } catch { setError('Failed to save sprite.') }
    finally { setIsSaving(false) }
  }

  const handleDeleteState = (id: string) => {
    setStates((prev) => prev.filter((s) => s.id !== id))
    if (activeStateId === id) {
      setActiveStateId(() => {
        const remaining = states.filter((s) => s.id !== id)
        return remaining[0]?.id ?? ''
      })
    }
  }
  const handleAddFrame = (stateId: string, frame: SpriteFrame) => {
    setStates((prev) => prev.map((s) => s.id === stateId
      ? { ...s, frames: [...s.frames, { ...frame, offsetX: frame.offsetX ?? 0, offsetY: frame.offsetY ?? 0 }] }
      : s))
  }
  const handleRemoveFrame = (stateId: string, frameIndex: number) => {
    setStates((prev) => prev.map((s) => s.id === stateId
      ? { ...s, frames: s.frames.filter((_, i) => i !== frameIndex) }
      : s))
  }
  const handleUpdateFrame = (stateId: string, frameIndex: number, updates: Partial<SpriteFrame>) => {
    setStates((prev) => prev.map((s) => s.id === stateId
      ? { ...s, frames: s.frames.map((f, i) => (i === frameIndex ? { ...f, ...updates } : f)) }
      : s))
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit sprite' : 'Import sprite'}
      titleAdornment={<StepIndicator step={step} />}
      height="min(860px, calc(100vh - 40px))"
      contentSx={{ p: 0, overflow: 'hidden' }}
      actions={
        <>
          <Button onClick={onClose} sx={dialogCancelButtonSx}>Cancel</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {step > 0 && (
              <Button onClick={() => setStep((s) => s - 1)} sx={dialogSecondaryButtonSx}>Back</Button>
            )}
            {step === 0 && (
              <Button onClick={() => void handleAdvanceFromStep1()} disabled={!canAdvanceStep1 || isAdvancing} sx={dialogPrimaryButtonSx}>
                {isAdvancing ? 'Loading…' : 'Next'}
              </Button>
            )}
            {step === 1 && (
              <Button onClick={() => { setFrameIndexSnapshot({ ...frameIndexByStateRef.current }); setStep(2) }} disabled={!canAdvanceStep2} sx={dialogPrimaryButtonSx}>
                Next
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => void handleSave()} disabled={isSaving} sx={dialogPrimaryButtonSx}>
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </Box>
        </>
      }
    >
      {error && (
        <Box sx={{ px: 3, pt: 1.5, flexShrink: 0 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {step === 0 && (
          <UploadStep
            projectName={projectName} spriteName={spriteName} setSpriteName={setSpriteName}
            baseFrameWidth={baseFrameWidth} setBaseFrameWidth={setBaseFrameWidth}
            baseFrameHeight={baseFrameHeight} setBaseFrameHeight={setBaseFrameHeight}
            file={file} setFile={setFile} imageUrl={imageUrl}
            imageNaturalWidth={imageSize.width} imageNaturalHeight={imageSize.height}
          />
        )}

        {step === 1 && imageUrl && (
          <StatesStep
            imageUrl={imageUrl} baseFrameWidth={baseFrameWidth} baseFrameHeight={baseFrameHeight}
            columns={columns} rows={rows} imageNaturalWidth={imageSize.width} imageNaturalHeight={imageSize.height}
            states={states} activeStateId={activeStateId} selectionMode={selectionMode}
            validationErrors={validationErrors} onSetActiveState={setActiveStateId}
            onSetSelectionMode={setSelectionMode} onOpenPresetPicker={setPickerAnchorEl}
            onDeleteState={handleDeleteState} onAddFrame={handleAddFrame}
            onRemoveFrame={handleRemoveFrame} onUpdateFrame={handleUpdateFrame}
            blockedColors={blockedColors} onAddBlockedColor={handleAddBlockedColor}
            onRemoveBlockedColor={handleRemoveBlockedColor}
            onCurrentFrameIndexChange={handleCurrentFrameIndexChange}
          />
        )}

        {step === 2 && imageUrl && (
          <ConfirmStep
            spriteName={spriteName} baseFrameWidth={baseFrameWidth} baseFrameHeight={baseFrameHeight}
            columns={columns} rows={rows} states={states} imageUrl={imageUrl}
            blockedColors={blockedColors} frameIndexSnapshot={frameIndexSnapshot}
          />
        )}
      </Box>

      <PresetPicker
        anchorEl={pickerAnchorEl}
        existingNames={states.map(s => s.name)}
        onAdd={(newStates) => { setStates(prev => [...prev, ...newStates]); if (newStates.length > 0) setActiveStateId(newStates[0].id) }}
        onClose={() => setPickerAnchorEl(null)}
      />
    </AppDialog>
  )
}
