import { Box } from '@mui/material'
import { SpriteSelectControl } from './SpriteSelectControl'
import { MovementSpeedControl } from './MovementSpeedControl'
import { CollisionBoxControls } from './CollisionBoxControls'
import { MirrorMovementControls } from './MirrorMovementControls'
import type { SpriteOption } from './types'

type PlayerInspectorPanelProps = {
  sprites: SpriteOption[]
  spriteId: number | ''
  moveSpeed: number
  speedLabel: string
  collisionWidth: string
  collisionHeight: string
  collisionOffsetX: string
  collisionOffsetY: string
  mirrorLeftToRight: boolean
  mirrorRightToLeft: boolean
  onSpriteChange: (value: number | '') => void
  onMoveSpeedChange: (value: number) => void
  onCollisionWidthChange: (value: string) => void
  onCollisionHeightChange: (value: string) => void
  onCollisionOffsetXChange: (value: string) => void
  onCollisionOffsetYChange: (value: string) => void
  onMirrorLeftToRightChange: (value: boolean) => void
  onMirrorRightToLeftChange: (value: boolean) => void
}

export function PlayerInspectorPanel(props: PlayerInspectorPanelProps) {
  return (
    <Box
      sx={{
        borderRadius: 5.5,
        px: 4,
        pt: 3,
        pb: 4,
        background: 'linear-gradient(180deg, rgba(24,31,42,0.7), rgba(15,20,28,0.66))',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <SpriteSelectControl
        sprites={props.sprites}
        value={props.spriteId}
        onChange={props.onSpriteChange}
      />

      <MovementSpeedControl
        value={props.moveSpeed}
        onChange={props.onMoveSpeedChange}
        speedLabel={props.speedLabel}
      />

      <CollisionBoxControls
        width={props.collisionWidth}
        height={props.collisionHeight}
        offsetX={props.collisionOffsetX}
        offsetY={props.collisionOffsetY}
        onWidthChange={props.onCollisionWidthChange}
        onHeightChange={props.onCollisionHeightChange}
        onOffsetXChange={props.onCollisionOffsetXChange}
        onOffsetYChange={props.onCollisionOffsetYChange}
      />

      <MirrorMovementControls
        leftToRight={props.mirrorLeftToRight}
        rightToLeft={props.mirrorRightToLeft}
        onLeftToRightChange={props.onMirrorLeftToRightChange}
        onRightToLeftChange={props.onMirrorRightToLeftChange}
      />
    </Box>
  )
}
