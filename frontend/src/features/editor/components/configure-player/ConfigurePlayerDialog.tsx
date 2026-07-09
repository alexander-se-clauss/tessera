import { Box } from '@mui/material'
import { AppDialog, dialogCancelButtonSx, dialogPrimaryButtonSx } from '../AppDialog'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { Button } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import type { PlayerConfig, Tileset } from '../../model/types'
import type { SpriteDefinition, SpriteFrame } from '../../sprites/types/sprite'
import { getSpriteFrameSourceRect } from '../../sprites/types/sprite'
import { MovementPreviewStrip } from './MovementPreviewStrip'
import { PlayerInspectorPanel } from './PlayerInspectorPanel'
import { PlayerPreviewPanel } from './PlayerPreviewPanel'
import type { SpriteFrameSource, SpriteOption } from './types'

type ConfigurePlayerDialogProps = {
  open: boolean
  sprites: Tileset[]
  currentConfig: PlayerConfig | null
  onClose: () => void
  onSave: (config: PlayerConfig) => void
}

function tilesetToSpriteDefinition(tileset: Tileset): SpriteDefinition {
  const meta = tileset.metadata as {
    states?: SpriteDefinition['states']
    blockedColors?: string[]
    baseFrameWidth?: number
    baseFrameHeight?: number
  }

  return {
    id: String(tileset.id),
    projectId: String(tileset.projectId),
    name: tileset.name,
    imageUrl: tileset.imageUrl,
    blockedColors: meta.blockedColors ?? [],
    baseFrameWidth: meta.baseFrameWidth ?? tileset.tileWidth,
    baseFrameHeight: meta.baseFrameHeight ?? tileset.tileHeight,
    columns: tileset.columns,
    rows: tileset.rows,
    states: meta.states ?? [],
    createdAt: tileset.createdAt,
    updatedAt: tileset.updatedAt,
  }
}

function resolveFrameSource(sprite: SpriteDefinition, frame: SpriteFrame | null | undefined): SpriteFrameSource {
  const fallbackFrame = frame ?? {
    col: 0,
    row: 0,
    spanX: 1,
    spanY: 1,
    offsetX: 0,
    offsetY: 0,
    duration: 150,
  }
  const rect = getSpriteFrameSourceRect(fallbackFrame, sprite.baseFrameWidth, sprite.baseFrameHeight)

  return {
    imageUrl: sprite.imageUrl,
    blockedColors: sprite.blockedColors,
    srcX: rect.x,
    srcY: rect.y,
    srcW: rect.width,
    srcH: rect.height,
    frameW: sprite.baseFrameWidth,
    frameH: sprite.baseFrameHeight,
  }
}

function pickPreviewFrame(sprite: SpriteDefinition) {
  const preferredState =
    sprite.states.find((state) => state.tag === 'idle') ??
    sprite.states.find((state) => state.tag === 'walk') ??
    sprite.states[0]

  return resolveFrameSource(sprite, preferredState?.frames[0])
}

function pickMovementFrames(sprite: SpriteDefinition) {
  const walkState =
    sprite.states.find((state) => state.name === 'walk_down') ??
    sprite.states.find((state) => state.tag === 'walk') ??
    sprite.states.find((state) => state.tag === 'idle') ??
    sprite.states[0]

  const frames = walkState?.frames ?? []
  if (frames.length === 0) {
    return Array.from({ length: 4 }, () => resolveFrameSource(sprite, null))
  }

  return Array.from({ length: 4 }, (_, index) => resolveFrameSource(sprite, frames[index % frames.length]))
}

function toSpriteOption(tileset: Tileset): SpriteOption {
  const sprite = tilesetToSpriteDefinition(tileset)
  return {
    id: tileset.id,
    name: tileset.name,
    tileset,
    sprite,
    previewFrame: pickPreviewFrame(sprite),
    movementFrames: pickMovementFrames(sprite),
  }
}

function getSpeedLabel(speed: number) {
  if (speed < 2.5) return 'Slow'
  if (speed > 6) return 'Fast'
  return 'Normal'
}

function clampInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? fallback : parsed
}

function clampSpeed(value: string) {
  const parsed = Number.parseFloat(value)
  if (Number.isNaN(parsed)) return 3
  return Math.max(0.1, Math.min(20, parsed))
}

export function ConfigurePlayerDialog({
  open,
  sprites,
  currentConfig,
  onClose,
  onSave,
}: ConfigurePlayerDialogProps) {
  const spriteOptions = useMemo(() => sprites.map(toSpriteOption), [sprites])
  const [spriteId, setSpriteId] = useState<number | ''>('')
  const [moveSpeed, setMoveSpeed] = useState('3')
  const [collisionWidth, setCollisionWidth] = useState('12')
  const [collisionHeight, setCollisionHeight] = useState('10')
  const [collisionOffsetX, setCollisionOffsetX] = useState('2')
  const [collisionOffsetY, setCollisionOffsetY] = useState('6')
  const [mirrorLeftToRight, setMirrorLeftToRight] = useState(false)
  const [mirrorRightToLeft, setMirrorRightToLeft] = useState(false)
  const [showGrid, setShowGrid] = useState(true)

  useEffect(() => {
    if (!open) {
      return
    }

    if (currentConfig) {
      setSpriteId(currentConfig.spriteId)
      setMoveSpeed(String(currentConfig.moveSpeed))
      setCollisionWidth(String(currentConfig.collisionBox.width))
      setCollisionHeight(String(currentConfig.collisionBox.height))
      setCollisionOffsetX(String(currentConfig.collisionBox.offsetX ?? 0))
      setCollisionOffsetY(String(currentConfig.collisionBox.offsetY ?? 0))
      setMirrorLeftToRight(currentConfig.mirrorMovements?.leftToRight ?? false)
      setMirrorRightToLeft(currentConfig.mirrorMovements?.rightToLeft ?? false)
    } else {
      setSpriteId(spriteOptions[0]?.id ?? '')
      setMoveSpeed('3.5')
      setCollisionWidth('12')
      setCollisionHeight('10')
      setCollisionOffsetX('2')
      setCollisionOffsetY('6')
      setMirrorLeftToRight(false)
      setMirrorRightToLeft(false)
    }
  }, [open, currentConfig, spriteOptions])

  const selectedSprite = spriteOptions.find((sprite) => sprite.id === spriteId) ?? spriteOptions[0] ?? null
  const speedValue = clampSpeed(moveSpeed)
  const widthValue = Math.max(1, Math.min(256, clampInt(collisionWidth, 12)))
  const heightValue = Math.max(1, Math.min(256, clampInt(collisionHeight, 10)))
  const offsetXValue = Math.max(-256, Math.min(256, clampInt(collisionOffsetX, 0)))
  const offsetYValue = Math.max(-256, Math.min(256, clampInt(collisionOffsetY, 0)))
  const canSave = spriteId !== '' && Boolean(selectedSprite)
  const speedLabel = getSpeedLabel(speedValue)

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Configure Player"
      maxWidth={false}
      paperSx={{ width: 'min(1200px, calc(100vw - 48px))', maxWidth: 'none', maxHeight: '90vh' }}
      contentSx={{ p: '0 !important', overflow: 'hidden' }}
      actionsJustify="flex-end"
      actions={
        <>
          <Button onClick={onClose} sx={dialogCancelButtonSx}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!canSave}
            startIcon={<SaveRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => {
              if (!selectedSprite) return
              onSave({
                spriteId: selectedSprite.id,
                moveSpeed: speedValue,
                collisionBox: { width: widthValue, height: heightValue, offsetX: offsetXValue, offsetY: offsetYValue },
                mirrorMovements: { leftToRight: mirrorLeftToRight, rightToLeft: mirrorRightToLeft },
              })
            }}
            sx={dialogPrimaryButtonSx}
          >
            Save Changes
          </Button>
        </>
      }
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.38fr) minmax(380px, 0.92fr)' }, minHeight: 0, overflow: 'hidden', flex: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, px: 4, py: 3 }}>
          <PlayerPreviewPanel
            frame={selectedSprite?.previewFrame ?? null}
            collisionBox={{
              width: widthValue,
              height: heightValue,
              offsetX: offsetXValue,
              offsetY: offsetYValue,
            }}
            showGrid={showGrid}
            onToggleGrid={() => setShowGrid((prev) => !prev)}
          />
          <MovementPreviewStrip
            frames={selectedSprite?.movementFrames ?? []}
            speed={speedValue}
          />
        </Box>

        <Box sx={{ minHeight: 0, overflowY: 'auto', px: 4, py: 3, borderLeft: { xs: 0, lg: '1px solid rgba(255,255,255,0.07)' } }}>
          <PlayerInspectorPanel
            sprites={spriteOptions}
            spriteId={spriteId}
            moveSpeed={speedValue}
            speedLabel={speedLabel}
            collisionWidth={collisionWidth}
            collisionHeight={collisionHeight}
            collisionOffsetX={collisionOffsetX}
            collisionOffsetY={collisionOffsetY}
            mirrorLeftToRight={mirrorLeftToRight}
            mirrorRightToLeft={mirrorRightToLeft}
            onSpriteChange={setSpriteId}
            onMoveSpeedChange={(value) => setMoveSpeed(String(value))}
            onCollisionWidthChange={setCollisionWidth}
            onCollisionHeightChange={setCollisionHeight}
            onCollisionOffsetXChange={setCollisionOffsetX}
            onCollisionOffsetYChange={setCollisionOffsetY}
            onMirrorLeftToRightChange={setMirrorLeftToRight}
            onMirrorRightToLeftChange={setMirrorRightToLeft}
          />
        </Box>
      </Box>
    </AppDialog>
  )
}
