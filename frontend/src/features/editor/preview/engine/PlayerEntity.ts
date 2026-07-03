import type { MapObject, PlayerConfig } from '../../model/types'
import type { SpriteDefinition, SpriteFrame, SpriteState } from '../../sprites/types/sprite'
import { getSpriteFrameSourceRect } from '../../sprites/types/sprite'
import type { CollisionMap } from './CollisionMap'
import type { InputHandler } from './InputHandler'
import type { ObjectCollisionMap } from './ObjectCollisionMap'

export type Direction = 'up' | 'down' | 'left' | 'right'
export type BorderCrossing = 'east' | 'west' | 'north' | 'south'

type ResolvedAnimationState = {
  name: string
  mirrorX: boolean
}

export class PlayerEntity {
  pixelX: number
  pixelY: number
  direction: Direction = 'down'
  invincibleTimer = 0
  readonly INVINCIBLE_DURATION = 0.8
  readonly FLASH_INTERVAL = 0.1

  private animState = 'idle'
  private animMirrorX = false
  private frameIndex = 0
  private frameTimer = 0

  private readonly tileW: number
  private readonly tileH: number
  private readonly moveSpeed: number
  private readonly collisionW: number
  private readonly collisionH: number
  private readonly boxOffsetX: number
  private readonly boxOffsetY: number
  private readonly mirrorLeftToRight: boolean
  private readonly mirrorRightToLeft: boolean
  private readonly sprite: SpriteDefinition

  constructor(
    spawnTileX: number,
    spawnTileY: number,
    tileW: number,
    tileH: number,
    playerConfig: PlayerConfig,
    sprite: SpriteDefinition,
  ) {
    this.tileW = tileW
    this.tileH = tileH
    this.moveSpeed = playerConfig.moveSpeed
    this.collisionW = playerConfig.collisionBox.width
    this.collisionH = playerConfig.collisionBox.height
    this.sprite = sprite
    this.boxOffsetX = playerConfig.collisionBox.offsetX
    this.boxOffsetY = playerConfig.collisionBox.offsetY
    this.mirrorLeftToRight = playerConfig.mirrorMovements?.leftToRight ?? false
    this.mirrorRightToLeft = playerConfig.mirrorMovements?.rightToLeft ?? false
    this.pixelX = spawnTileX * tileW
    this.pixelY = spawnTileY * tileH
  }

  get centerX(): number {
    return this.pixelX + this.sprite.baseFrameWidth / 2
  }

  get centerY(): number {
    return this.pixelY + this.sprite.baseFrameHeight / 2
  }

  get collisionX(): number {
    return this.pixelX + this.boxOffsetX
  }

  get collisionY(): number {
    return this.pixelY + this.boxOffsetY
  }

  get collisionWidth(): number {
    return this.collisionW
  }

  get collisionHeight(): number {
    return this.collisionH
  }

  get collisionOffsetX(): number {
    return this.boxOffsetX
  }

  get collisionOffsetY(): number {
    return this.boxOffsetY
  }

  get tileX(): number {
    return Math.floor(this.collisionX / this.tileW)
  }

  get tileY(): number {
    return Math.floor(this.collisionY / this.tileH)
  }

  setCollisionPosition(x: number, y: number): void {
    this.pixelX = x - this.boxOffsetX
    this.pixelY = y - this.boxOffsetY
  }

  clampCollisionWithin(mapPixelW: number, mapPixelH: number): void {
    const x = Math.max(0, Math.min(this.collisionX, mapPixelW - this.collisionW))
    const y = Math.max(0, Math.min(this.collisionY, mapPixelH - this.collisionH))
    this.setCollisionPosition(x, y)
  }

  update(
    dt: number,
    input: InputHandler,
    collision: CollisionMap,
    objectCollision?: ObjectCollisionMap,
    onBlockedObject?: (object: MapObject, direction: Direction) => boolean,
  ): void {
    if (this.invincibleTimer > 0) {
      this.invincibleTimer = Math.max(0, this.invincibleTimer - dt)
    }

    const speed = this.moveSpeed * this.tileW * dt
    let vx = 0
    let vy = 0

    const left = input.isDown('a')
    const right = input.isDown('d')
    const up = input.isDown('w')
    const down = input.isDown('s')

    if (left || right) {
      vx = right ? speed : -speed
      this.direction = right ? 'right' : 'left'
    } else if (up || down) {
      vy = down ? speed : -speed
      this.direction = down ? 'down' : 'up'
    }

    const moving = vx !== 0 || vy !== 0

    if (vx !== 0) {
      const nextX = this.pixelX + vx
      if (!this.collidesAt(nextX, this.pixelY, collision)) {
        const blockedObject = objectCollision?.getCollidingObjectForBox(
          nextX + this.boxOffsetX,
          this.pixelY + this.boxOffsetY,
          nextX + this.boxOffsetX + this.collisionW - 1,
          this.pixelY + this.boxOffsetY + this.collisionH - 1,
          this.tileW,
          this.tileH,
        ) ?? null
        if (blockedObject) {
          onBlockedObject?.(blockedObject, vx > 0 ? 'right' : 'left')
        } else {
          this.pixelX = nextX
        }
      }
    }

    if (vy !== 0) {
      const nextY = this.pixelY + vy
      if (!this.collidesAt(this.pixelX, nextY, collision)) {
        const blockedObject = objectCollision?.getCollidingObjectForBox(
          this.pixelX + this.boxOffsetX,
          nextY + this.boxOffsetY,
          this.pixelX + this.boxOffsetX + this.collisionW - 1,
          nextY + this.boxOffsetY + this.collisionH - 1,
          this.tileW,
          this.tileH,
        ) ?? null
        if (blockedObject) {
          onBlockedObject?.(blockedObject, vy > 0 ? 'down' : 'up')
        } else {
          this.pixelY = nextY
        }
      }
    }

    this.updateAnimation(dt, moving)
  }

  updateAnimation(dt: number, moving: boolean): void {
    const nextState = this.resolveAnimationState(moving)

    if (nextState.name !== this.animState || nextState.mirrorX !== this.animMirrorX) {
      this.animState = nextState.name
      this.animMirrorX = nextState.mirrorX
      this.frameIndex = 0
      this.frameTimer = 0
    }

    if (!moving && nextState.name.startsWith('walk_')) {
      this.frameIndex = 0
      this.frameTimer = 0
      return
    }

    const frames = this.currentFrames()
    if (frames.length > 1) {
      const dur = (frames[this.frameIndex]?.duration ?? 100) / 1000
      this.frameTimer += dt
      if (this.frameTimer >= dur) {
        this.frameTimer -= dur
        this.frameIndex = (this.frameIndex + 1) % frames.length
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, spriteImage: HTMLCanvasElement | HTMLImageElement, cameraX: number, cameraY: number): void {
    this.drawAt(ctx, spriteImage, Math.round(this.pixelX - cameraX), Math.round(this.pixelY - cameraY))
  }

  drawAt(ctx: CanvasRenderingContext2D, spriteImage: HTMLCanvasElement | HTMLImageElement, screenX: number, screenY: number): void {
    const shouldFlash = this.invincibleTimer > 0 && Math.floor(this.invincibleTimer / this.FLASH_INTERVAL) % 2 === 0
    if (shouldFlash) return

    const frames = this.currentFrames()
    const frame = frames[Math.min(this.frameIndex, frames.length - 1)]
    if (!frame) return

    const src = getSpriteFrameSourceRect(frame, this.sprite.baseFrameWidth, this.sprite.baseFrameHeight)

    ctx.imageSmoothingEnabled = false
    if (this.animMirrorX) {
      ctx.save()
      ctx.translate(screenX + src.width, screenY)
      ctx.scale(-1, 1)
      ctx.drawImage(spriteImage, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height)
      ctx.restore()
    } else {
      ctx.drawImage(spriteImage, src.x, src.y, src.width, src.height, screenX, screenY, src.width, src.height)
    }
  }

  private collidesCorner(cx: number, cy: number, collision: CollisionMap): boolean {
    const tileX = Math.floor(cx / this.tileW)
    const tileY = Math.floor(cy / this.tileH)
    if (collision.isOutOfBounds(tileX, tileY)) return false
    const hitbox = collision.getHitbox(tileX, tileY)
    if (!hitbox) return false
    const left = tileX * this.tileW + hitbox.offsetX
    const top = tileY * this.tileH + hitbox.offsetY
    return cx >= left && cx < left + hitbox.width && cy >= top && cy < top + hitbox.height
  }

  private collidesAt(px: number, py: number, collision: CollisionMap): boolean {
    const boxLeft = px + this.boxOffsetX
    const boxTop = py + this.boxOffsetY
    const boxRight = boxLeft + this.collisionW - 1
    const boxBottom = boxTop + this.collisionH - 1

    return (
      this.collidesCorner(boxLeft, boxTop, collision) ||
      this.collidesCorner(boxRight, boxTop, collision) ||
      this.collidesCorner(boxLeft, boxBottom, collision) ||
      this.collidesCorner(boxRight, boxBottom, collision)
    )
  }

  private findState(name: string): SpriteState | undefined {
    const normalizedName = normalizeStateName(name)
    return this.sprite.states.find((s) => normalizeStateName(s.name) === normalizedName)
  }

  private findDirectionalState(baseName: string, direction: Direction): SpriteState | undefined {
    const exactName = `${baseName}_${direction}`
    const exact = this.findState(exactName)
    if (exact) return exact

    const normalizedBase = normalizeStateName(baseName)
    const normalizedDirection = normalizeStateName(direction)

    const namedMatch = this.sprite.states.find((state) => {
      const normalizedName = normalizeStateName(state.name)
      return (
        normalizedName === `${normalizedBase}_${normalizedDirection}` ||
        normalizedName === `${normalizedDirection}_${normalizedBase}` ||
        normalizedName.includes(`${normalizedBase}_${normalizedDirection}`) ||
        normalizedName.includes(`${normalizedDirection}_${normalizedBase}`)
      )
    })
    if (namedMatch) return namedMatch

    return this.sprite.states.find((state) => {
      const normalizedName = normalizeStateName(state.name)
      return state.tag === baseName && (
        normalizedName === normalizedDirection ||
        normalizedName === `${normalizedDirection}_${normalizedBase}` ||
        normalizedName === `${normalizedBase}_${normalizedDirection}` ||
        normalizedName.startsWith(`${normalizedDirection}_`) ||
        normalizedName.endsWith(`_${normalizedDirection}`)
      )
    })
  }

  private resolveAnimationState(moving: boolean): ResolvedAnimationState {
    const walkState = this.resolveDirectionalState('walk', this.direction)
    const idleState = this.resolveDirectionalState('idle', this.direction)

    if (moving) {
      return walkState ?? { name: 'idle', mirrorX: false }
    }

    if (idleState) return idleState
    if (walkState) return walkState
    return { name: 'idle', mirrorX: false }
  }

  private resolveDirectionalState(baseName: string, direction: Direction): ResolvedAnimationState | null {
    const state = this.findDirectionalState(baseName, direction)
    if (state) return { name: state.name, mirrorX: false }

    if (direction === 'right' && this.mirrorLeftToRight) {
      const mirroredState = this.findDirectionalState(baseName, 'left')
      if (mirroredState) return { name: mirroredState.name, mirrorX: true }
    }

    if (direction === 'left' && this.mirrorRightToLeft) {
      const mirroredState = this.findDirectionalState(baseName, 'right')
      if (mirroredState) return { name: mirroredState.name, mirrorX: true }
    }

    return null
  }

  private currentFrames(): SpriteFrame[] {
    const state =
      this.findState(this.animState) ??
      this.sprite.states.find((s) => s.tag === 'idle') ??
      this.sprite.states[0]
    return state?.frames ?? []
  }
}

function normalizeStateName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s-]+/g, '_')
}
