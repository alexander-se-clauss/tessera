export type SpriteStateTag =
  | 'idle' | 'walk' | 'run' | 'jump' | 'fall'
  | 'attack' | 'hurt' | 'die' | 'swim'
  | 'climb' | 'push' | 'carry' | 'sit' | 'sleep' | 'custom'

export const TAG_COLORS: Record<SpriteStateTag, string> = {
  idle: '#388bfd',
  walk: '#3d8a4e',
  run: '#7ab648',
  jump: '#C0DD97',
  fall: '#8b949e',
  attack: '#e84b4a',
  hurt: '#e8a832',
  die: '#6a0000',
  swim: '#1a5a9a',
  climb: '#5c3e1a',
  push: '#6e5628',
  carry: '#323248',
  sit: '#6d5d8c',
  sleep: '#465a7a',
  custom: '#6a737d',
}

export interface SpriteFrame {
  col: number
  row: number
  spanX: number
  spanY: number
  offsetX: number
  offsetY: number
  pixelX?: number
  pixelY?: number
  pixelW?: number
  pixelH?: number
  duration: number
}

export interface SpriteState {
  id: string
  name: string
  tag: SpriteStateTag
  frames: SpriteFrame[]
}

export interface SpriteDefinition {
  id: string
  projectId: string
  name: string
  imageUrl: string
  blockedColors: string[]
  baseFrameWidth: number
  baseFrameHeight: number
  columns: number
  rows: number
  states: SpriteState[]
  createdAt: string
  updatedAt: string
}

export function getSpriteFrameSourceRect(
  frame: SpriteFrame,
  baseFrameWidth: number,
  baseFrameHeight: number,
) {
  if (
    frame.pixelX !== undefined &&
    frame.pixelY !== undefined &&
    frame.pixelW !== undefined &&
    frame.pixelH !== undefined
  ) {
    return {
      x: frame.pixelX,
      y: frame.pixelY,
      width: frame.pixelW,
      height: frame.pixelH,
    }
  }

  return {
    x: frame.col * baseFrameWidth + frame.offsetX,
    y: frame.row * baseFrameHeight + frame.offsetY,
    width: frame.spanX * baseFrameWidth,
    height: frame.spanY * baseFrameHeight,
  }
}
