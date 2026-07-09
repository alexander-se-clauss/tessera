import { Box } from '@mui/material'
import type { SpriteFrame, SpriteState } from '../../types/sprite'
import type { SelectionMode } from '../../hooks/useFrameSelection'
import { StatesSidebar } from '../StatesSidebar'
import { FramePicker } from '../FramePicker'
import { StateDetail } from '../StateDetail'

type StatesStepProps = {
  imageUrl: string
  baseFrameWidth: number
  baseFrameHeight: number
  imageNaturalWidth: number
  imageNaturalHeight: number
  states: SpriteState[]
  activeStateId: string
  selectionMode: SelectionMode
  validationErrors: Map<string, string>
  blockedColors: string[]
  currentFrameIndex: number
  onSetActiveState: (id: string) => void
  onSetSelectionMode: (mode: SelectionMode) => void
  onOpenPresetPicker: (anchorEl: HTMLElement) => void
  onDeleteState: (id: string) => void
  onAddFrame: (stateId: string, frame: SpriteFrame) => void
  onRemoveFrame: (stateId: string, frameIndex: number) => void
  onUpdateFrame: (stateId: string, frameIndex: number, updates: Partial<SpriteFrame>) => void
  onAddBlockedColor: (color: string) => void
  onRemoveBlockedColor: (color: string) => void
  onCurrentFrameIndexChange: (stateId: string, index: number) => void
}

export function StatesStep({
  imageUrl,
  baseFrameWidth,
  baseFrameHeight,
  imageNaturalWidth,
  imageNaturalHeight,
  states,
  activeStateId,
  selectionMode,
  validationErrors,
  blockedColors,
  currentFrameIndex,
  onSetActiveState,
  onSetSelectionMode,
  onOpenPresetPicker,
  onDeleteState,
  onAddFrame,
  onRemoveFrame,
  onUpdateFrame,
  onAddBlockedColor,
  onRemoveBlockedColor,
  onCurrentFrameIndexChange,
}: StatesStepProps) {
  const activeState = states.find((state) => state.id === activeStateId) ?? null

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: '260px minmax(0, 1fr) 300px',
        },
        gap: 0,
        flex: 1,
        minHeight: 0,
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      <StatesSidebar
        states={states}
        activeStateId={activeStateId}
        validationErrors={validationErrors}
        onSetActiveState={onSetActiveState}
        onOpenPresetPicker={onOpenPresetPicker}
        onDeleteState={onDeleteState}
      />
      <FramePicker
        imageUrl={imageUrl}
        baseFrameWidth={baseFrameWidth}
        baseFrameHeight={baseFrameHeight}
        imageNaturalWidth={imageNaturalWidth}
        imageNaturalHeight={imageNaturalHeight}
        states={states}
        activeStateId={activeStateId}
        selectionMode={selectionMode}
        blockedColors={blockedColors}
        onSetSelectionMode={onSetSelectionMode}
        onSetActiveState={onSetActiveState}
        onAddFrame={onAddFrame}
        onRemoveFrame={onRemoveFrame}
        onAddBlockedColor={onAddBlockedColor}
      />
      <StateDetail
        imageUrl={imageUrl}
        baseFrameWidth={baseFrameWidth}
        baseFrameHeight={baseFrameHeight}
        activeState={activeState}
        currentFrameIndex={currentFrameIndex}
        blockedColors={blockedColors}
        onRemoveBlockedColor={onRemoveBlockedColor}
        onRemoveFrame={onRemoveFrame}
        onUpdateFrame={onUpdateFrame}
        onCurrentFrameIndexChange={onCurrentFrameIndexChange}
      />
    </Box>
  )
}
