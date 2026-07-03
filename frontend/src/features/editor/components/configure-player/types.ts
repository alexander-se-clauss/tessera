import type { Tileset } from '../../model/types'
import type { SpriteDefinition } from '../../sprites/types/sprite'

export type SpriteFrameSource = {
  imageUrl: string
  blockedColors: string[]
  srcX: number
  srcY: number
  srcW: number
  srcH: number
  frameW: number
  frameH: number
}

export type SpriteOption = {
  id: number
  name: string
  tileset: Tileset
  sprite: SpriteDefinition
  previewFrame: SpriteFrameSource
  movementFrames: SpriteFrameSource[]
}
