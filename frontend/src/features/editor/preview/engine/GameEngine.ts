import type { GameMap, GroupNeighbors, MapEvent, MapObject, ObjectType, PlayerConfig } from '../../model/types'
import type { SpriteDefinition } from '../../sprites/types/sprite'
import { AnimatedTileTracker } from './AnimatedTileTracker'
import { Camera } from './Camera'
import { CollisionMap } from './CollisionMap'
import { HudRenderer } from './HudRenderer'
import { InputHandler } from './InputHandler'
import { MenuRenderer } from './MenuRenderer'
import { ObjectCollisionMap } from './ObjectCollisionMap'
import { OffscreenMapRenderer } from './OffscreenMapRenderer'
import { type Direction, PlayerEntity } from './PlayerEntity'
import { PlayerState } from './PlayerState'
import { TileRenderer } from './TileRenderer'
import { TransitionRenderer, easeInOut } from './TransitionRenderer'
import type {
  GameEngineApi,
  GameEngineAssets,
  LoadedMap,
  NeighborCacheKey,
  ScreenTransition,
  ScreenTransitionDirection,
} from './types'

const VIEWPORT_W = 160
const VIEWPORT_H = 144
const HUD_H = 16
const GAME_VIEWPORT_H = VIEWPORT_H - HUD_H
const TRANSITION_DURATION_MS = 320

interface ActiveSlide {
  object: MapObject
  fromX: number
  fromY: number
  toX: number
  toY: number
  progress: number
  duration: number
}

interface SpawnAnimation {
  object: MapObject
  progress: number
  duration: number
}

export class GameEngine {
  private readonly ctx: CanvasRenderingContext2D
  private readonly animatedTileTracker: AnimatedTileTracker
  private readonly tileImages: GameEngineAssets['tileImages']
  private readonly tileHitboxes: GameEngineAssets['tileHitboxes']
  private readonly objectTypes: ObjectType[]
  private readonly objectTypeMap: Map<string, ObjectType>
  private readonly spriteImage: HTMLCanvasElement | HTMLImageElement
  private readonly camera: Camera
  private readonly input: InputHandler
  private readonly playerState: PlayerState
  private readonly player: PlayerEntity
  private readonly renderer: TileRenderer
  private readonly hudRenderer: HudRenderer
  private readonly menuRenderer: MenuRenderer
  private readonly offscreenRenderer: OffscreenMapRenderer
  private readonly transitionRenderer: TransitionRenderer
  private readonly authToken: string | null
  private readonly mapCache = new Map<number, LoadedMap>()
  private readonly eventCache = new Map<number, MapEvent[]>()
  private readonly neighborCache = new Map<NeighborCacheKey, GroupNeighbors>()

  private map: LoadedMap
  private events: MapEvent[]
  private collision: CollisionMap
  private objectCollision: ObjectCollisionMap
  private rafId = 0
  private lastTimestamp = 0
  private running = false
  private paused = false
  private menuOpen = false
  private activeTransition: ScreenTransition | null = null
  private pendingTransition = false
  private activeSlide: ActiveSlide | null = null
  private readonly spawnAnimations: SpawnAnimation[] = []
  private readonly collectedObjectIdsByMap = new Map<number, Set<string>>()
  private readonly warnedSignalDoorIds = new Set<string>()
  private readonly respawnPoint: { x: number; y: number }

  constructor(
    canvas: HTMLCanvasElement,
    map: GameMap,
    events: MapEvent[],
    assets: GameEngineAssets,
    api: GameEngineApi,
    sprite: SpriteDefinition,
    spriteImage: HTMLCanvasElement | HTMLImageElement,
    spawnPoint: { x: number; y: number },
    playerConfig: PlayerConfig,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get 2D canvas context')
    const runtimeMap = cloneLoadedMap(map)
    this.ctx = ctx
    this.map = runtimeMap
    this.events = cloneEvents(events)
    this.animatedTileTracker = new AnimatedTileTracker(assets.tilesets)
    this.tileImages = assets.tileImages
    this.tileHitboxes = assets.tileHitboxes
    this.objectTypes = assets.objectTypes
    this.objectTypeMap = new Map(assets.objectTypes.map((objectType) => [String(objectType.id), objectType]))
    this.authToken = api.authToken
    this.spriteImage = spriteImage

    this.camera = new Camera(VIEWPORT_W, GAME_VIEWPORT_H)
    this.collision = new CollisionMap(this.map, this.tileHitboxes)
    this.objectCollision = this.buildObjectCollisionMap()
    this.input = new InputHandler()
    this.playerState = new PlayerState()
    this.renderer = new TileRenderer()
    this.hudRenderer = new HudRenderer(this.ctx, this.playerState, this.inventoryScopeId())
    this.menuRenderer = new MenuRenderer(this.ctx, this.playerState, this.inventoryScopeId())
    this.offscreenRenderer = new OffscreenMapRenderer()
    this.transitionRenderer = new TransitionRenderer()
    this.player = new PlayerEntity(spawnPoint.x, spawnPoint.y, map.tileWidth, map.tileHeight, playerConfig, sprite)
    this.respawnPoint = spawnPoint
    this.mapCache.set(runtimeMap.id, runtimeMap)
    this.eventCache.set(runtimeMap.id, this.events)
  }

  start(): void {
    this.running = true
    this.paused = false
    this.lastTimestamp = performance.now()
    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    if (!this.running) return
    this.paused = false
    this.lastTimestamp = performance.now()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.input.destroy()
  }

  private loop(timestamp: number): void {
    if (!this.running) return

    if (!this.paused) {
      const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1)
      this.lastTimestamp = timestamp
      this.update(dt)
    }

    this.render()
    this.rafId = requestAnimationFrame((t) => this.loop(t))
  }

  private update(dt: number): void {
    if (this.input.isMenuPressed()) {
      this.menuOpen = !this.menuOpen
    }

    if (this.activeTransition) {
      this.animatedTileTracker.update(dt * 1000)
      this.updateTransition(dt)
      return
    }

    if (this.menuOpen) {
      this.player.updateAnimation(dt, false)
      return
    }

    this.animatedTileTracker.update(dt * 1000)
    this.updateSpawnAnimations(dt)

    if (this.activeSlide) {
      this.updateSlide(dt)
      this.player.updateAnimation(dt, false)
      this.updateCamera()
      return
    }

    if (!this.pendingTransition) {
      this.player.update(dt, this.input, this.collision, this.objectCollision, (object, direction) => this.tryPushBlock(object, direction))
      const crossing = this.detectCrossing()
      if (crossing) {
        this.handleCrossing(crossing)
      }
      this.checkCollectibleContact()
      this.checkStatefulTouchTransitions()
      if (this.input.isActionJustPressed()) {
        this.handleInteraction()
      }
      this.checkHazardContact()
    } else {
      this.player.updateAnimation(dt, true)
    }

    this.updateCamera()
  }

  private updateCamera(): void {
    const mapPixelW = this.map.width * this.map.tileWidth
    const mapPixelH = this.map.height * this.map.tileHeight
    this.camera.follow(this.player.centerX, this.player.centerY, mapPixelW, mapPixelH)
  }

  private updateTransition(dt: number): void {
    const transition = this.activeTransition
    if (!transition) return

    transition.elapsed += dt * 1000
    transition.progress = Math.min(1, transition.elapsed / transition.duration)
    this.player.updateAnimation(dt, true)

    if (transition.progress < 1) return

    this.map = transition.toMap
    this.events = this.eventCache.get(this.map.id) ?? []
    this.collision = new CollisionMap(this.map, this.tileHitboxes)
    this.rebuildObjectCollisionMap()
    this.hudRenderer.setActiveMapGroupId(this.inventoryScopeId())
    this.menuRenderer.setActiveMapGroupId(this.inventoryScopeId())
    this.player.setCollisionPosition(transition.playerEntryX, transition.playerEntryY)
    this.camera.reset()
    this.activeTransition = null
    this.pendingTransition = false
  }

  private render(): void {
    const ctx = this.ctx

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H)

    if (this.activeTransition) {
      this.renderTransition(this.activeTransition)
    } else {
      this.renderMap()
      if (this.menuOpen) {
        this.menuRenderer.render()
      }
    }

    this.hudRenderer.render()

    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, VIEWPORT_W, VIEWPORT_H)
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('PAUSED', VIEWPORT_W / 2, VIEWPORT_H / 2)
    }
  }

  private renderMap(): void {
    this.ctx.save()
    this.ctx.translate(0, HUD_H)
    const bgLayer = this.map.layers.find((l) => l.type === 'background' && l.visible)
    if (bgLayer) {
      this.renderer.drawLayer(this.ctx, bgLayer, this.tileImages, this.map.tileWidth, this.map.tileHeight, this.camera, this.animatedTileTracker)
    }

    this.renderObjects(this.ctx, this.map, 0, 0)

    this.player.draw(this.ctx, this.spriteImage, this.camera.x, this.camera.y)

    const fgLayer = this.map.layers.find((l) => l.type === 'foreground' && l.visible)
    if (fgLayer) {
      this.renderer.drawLayer(this.ctx, fgLayer, this.tileImages, this.map.tileWidth, this.map.tileHeight, this.camera, this.animatedTileTracker)
    }
    this.ctx.restore()
  }

  private renderTransition(transition: ScreenTransition): void {
    this.ctx.save()
    this.ctx.translate(0, HUD_H)
    const offset = this.transitionRenderer.render(this.ctx, transition)
    const player = this.transitionPlayerPosition(transition)
    this.player.drawAt(this.ctx, this.spriteImage, Math.round(player.x - offset.offsetX), Math.round(player.y - offset.offsetY))
    this.ctx.restore()
  }

  private renderObjects(ctx: CanvasRenderingContext2D, map: LoadedMap, offsetX: number, offsetY: number): void {
    ctx.imageSmoothingEnabled = false

    const sortedObjects = [...(map.objects ?? [])].sort((a, b) => a.y - b.y || a.x - b.x)
    for (const object of sortedObjects) {
      if ((object.properties as Record<string, unknown>).visible === false) continue

      const objectType = this.objectTypeMap.get(String(object.objectTypeId))
      if (!objectType) continue

      // New stateful objects always render (each state has a sprite); legacy open doors are skipped.
      if (!objectType.config.isStateful && object.properties.interaction?.type === 'door' && object.properties.currentState === 'open') continue

      const slide = this.activeSlide?.object.id === object.id ? this.activeSlide : null
      const spawn = this.spawnAnimations.find((animation) => animation.object.id === object.id)
      const easedSlide = slide ? easeInOut(slide.progress) : 0
      const renderTileX = slide ? slide.fromX + (slide.toX - slide.fromX) * easedSlide : object.x
      const renderTileY = slide ? slide.fromY + (slide.toY - slide.fromY) * easedSlide : object.y
      const spawnOffsetY = spawn ? spawnDropOffset(spawn.progress, map.tileHeight) : 0

      const baseTileIndex = this.objectBaseTileIndex(object, objectType)
      const tileIndex = this.animatedTileTracker.resolveTileIndex(objectType.tilesetId, baseTileIndex)
      const key = `${objectType.tilesetId}:${tileIndex}` as const
      const img = this.tileImages.get(key)
      if (!img) continue
      const sourceW = img instanceof HTMLImageElement ? img.naturalWidth : img.width
      const sourceH = img instanceof HTMLImageElement ? img.naturalHeight : img.height
      if (sourceW === 0 || sourceH === 0) continue

      const spanX = objectType.config.visual.spanX ?? objectType.spanX ?? 1
      const spanY = objectType.config.visual.spanY ?? objectType.spanY ?? 1
      const screenX = renderTileX * map.tileWidth - this.camera.x + offsetX
      const screenY = renderTileY * map.tileHeight - this.camera.y + offsetY + spawnOffsetY
      const width = map.tileWidth * spanX
      const height = map.tileHeight * spanY

      if (screenX + width < 0 || screenX > this.camera.viewportW) continue
      if (screenY + height < 0 || screenY > this.camera.viewportH) continue

      ctx.drawImage(img, 0, 0, sourceW, sourceH, Math.round(screenX), Math.round(screenY), width, height)
    }
  }

  private buildObjectCollisionMap(ignoreObjectIds = new Set<string>()): ObjectCollisionMap {
    const spawningIds = new Set(this.spawnAnimations.map((animation) => animation.object.id))
    return new ObjectCollisionMap(this.map.objects ?? [], this.objectTypeMap, new Set([...ignoreObjectIds, ...spawningIds]))
  }

  private rebuildObjectCollisionMap(): void {
    this.objectCollision = this.buildObjectCollisionMap()
  }

  private updateSlide(dt: number): void {
    const slide = this.activeSlide
    if (!slide) return

    slide.progress = Math.min(1, slide.progress + dt / slide.duration)
    if (slide.progress < 1) return

    slide.object.x = slide.toX
    slide.object.y = slide.toY
    if (slide.object.properties.movement?.pattern === 'push_once') {
      slide.object.properties = { ...slide.object.properties, movement: null }
    }
    const emitterTriggerId = slide.object.properties.emitter?.condition === 'on_pushed' ? (slide.object.properties.emitter.triggerId || null) : null
    const triggerId = emitterTriggerId ?? readStringProperty(slide.object.properties, 'firesTriggerId') ?? readStringProperty(slide.object.properties.interaction, 'triggerId')
    this.activeSlide = null
    this.rebuildObjectCollisionMap()

    // Fire on_pushed state transition for stateful objects
    const pushedObjectType = this.objectTypeMap.get(String(slide.object.objectTypeId))
    if (pushedObjectType?.config.isStateful && pushedObjectType.config.stateTransitions) {
      const currentState = slide.object.properties.currentState ?? slide.object.properties.initialStateId ?? pushedObjectType.config.stateDefs?.[0]?.id
      const transition = pushedObjectType.config.stateTransitions.find((t) =>
        t.condition === 'on_pushed' && t.fromStateId === currentState,
      )
      if (transition) this.applyStateTransition(slide.object, pushedObjectType, transition.toStateId)
    }

    this.fireTrigger(triggerId)
  }

  private updateSpawnAnimations(dt: number): void {
    if (this.spawnAnimations.length === 0) return

    for (let index = this.spawnAnimations.length - 1; index >= 0; index -= 1) {
      const animation = this.spawnAnimations[index]
      animation.progress = Math.min(1, animation.progress + dt / animation.duration)
      if (animation.progress >= 1) {
        this.spawnAnimations.splice(index, 1)
        this.rebuildObjectCollisionMap()
      }
    }
  }

  private tryPushBlock(blockedObj: MapObject, direction: Direction): boolean {
    if (this.activeSlide) return false

    const pattern = blockedObj.properties.movement?.pattern
    if (pattern !== 'push_once' && pattern !== 'push_infinite') return false

    const delta = directionDelta(direction)
    const destX = blockedObj.x + delta.x
    const destY = blockedObj.y + delta.y

    if (pattern === 'push_once') {
      if (this.isCellBlocked(destX, destY, blockedObj.id)) return false
      this.startSlide(blockedObj, destX, destY)
      return true
    }

    let tx = destX
    let ty = destY
    if (this.isCellBlocked(tx, ty, blockedObj.id)) return false
    while (!this.isCellBlocked(tx + delta.x, ty + delta.y, blockedObj.id)) {
      tx += delta.x
      ty += delta.y
    }
    this.startSlide(blockedObj, tx, ty)
    return true
  }

  private startSlide(object: MapObject, toX: number, toY: number): void {
    const distance = Math.max(Math.abs(toX - object.x), Math.abs(toY - object.y), 1)
    this.activeSlide = {
      object,
      fromX: object.x,
      fromY: object.y,
      toX,
      toY,
      progress: 0,
      duration: distance * 0.15,
    }
    this.rebuildObjectCollisionMap()
  }

  private isCellBlocked(x: number, y: number, ignoreObjectId?: string): boolean {
    if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) return true
    if (this.collision.getHitbox(x, y)) return true
    return this.buildObjectCollisionMap(ignoreObjectId ? new Set([ignoreObjectId]) : undefined).isSolid(x, y)
  }

  private checkHazardContact(): void {
    if (this.player.invincibleTimer > 0) return

    const playerTileX = this.player.tileX
    const playerTileY = this.player.tileY

    for (const obj of this.map.objects ?? []) {
      if ((obj.properties as Record<string, unknown>).visible === false) continue
      const objectType = this.objectTypeMap.get(String(obj.objectTypeId))
      if (!objectType || objectType.category !== 'hazard') continue
      if (!this.objectOccupiesCell(obj, playerTileX, playerTileY)) continue

      const damage = readNumberProperty(obj.properties, 'damageHalfHearts') ?? 1
      this.playerState.takeDamage(damage)
      this.player.invincibleTimer = this.player.INVINCIBLE_DURATION

      if (this.playerState.isDead()) {
        this.handleGameOver()
      }
      break
    }
  }

  private checkCollectibleContact(): void {
    const target = [...(this.map.objects ?? [])].reverse().find((object) => {
      if ((object.properties as Record<string, unknown>).visible === false) return false
      if (object.properties.interaction?.type !== 'collect') return false
      return this.playerOverlapsCollectibleHitbox(object)
    })

    if (target) {
      this.collectObject(target)
    }
  }

  private checkStatefulTouchTransitions(): void {
    const playerTileX = this.player.tileX
    const playerTileY = this.player.tileY
    for (const obj of this.map.objects ?? []) {
      if (!this.objectOccupiesCell(obj, playerTileX, playerTileY)) continue
      const objectType = this.objectTypeMap.get(String(obj.objectTypeId))
      if (!objectType?.config.isStateful || !objectType.config.stateTransitions) continue
      const currentState = obj.properties.currentState ?? obj.properties.initialStateId ?? objectType.config.stateDefs?.[0]?.id
      const transition = objectType.config.stateTransitions.find((t) =>
        t.condition === 'on_touched' && t.fromStateId === currentState,
      )
      if (transition) this.applyStateTransition(obj, objectType, transition.toStateId)
    }
  }

  private handleInteraction(): void {
    const delta = directionDelta(this.player.direction)
    const facingX = this.player.tileX + delta.x
    const facingY = this.player.tileY + delta.y
    const target = [...(this.map.objects ?? [])].reverse().find((object) => {
      if (!this.objectOccupiesCell(object, facingX, facingY)) return false
      if (object.properties.interaction != null) return true
      const ot = this.objectTypeMap.get(String(object.objectTypeId))
      return Boolean(ot?.config.isStateful && ot.config.stateTransitions?.some((t) => t.condition === 'on_interact'))
    })
    if (!target) {
      this.handleEventInteraction(facingX, facingY)
      return
    }

    // Check stateful on_interact transition
    const targetObjectType = this.objectTypeMap.get(String(target.objectTypeId))
    if (targetObjectType?.config.isStateful && targetObjectType.config.stateTransitions) {
      const currentState = target.properties.currentState ?? target.properties.initialStateId ?? targetObjectType.config.stateDefs?.[0]?.id
      const transition = targetObjectType.config.stateTransitions.find((t) =>
        t.condition === 'on_interact' && t.fromStateId === currentState,
      )
      if (transition) {
        this.applyStateTransition(target, targetObjectType, transition.toStateId)
        return
      }
    }

    if (!target.properties.interaction) {
      this.handleEventInteraction(facingX, facingY)
      return
    }

    switch (target.properties.interaction.type) {
      case 'collect': {
        this.collectObject(target)
        break
      }
      case 'toggle_state': {
        const targetState = target.properties.interaction.targetState
        if (targetState) {
          target.properties.currentState = targetState
          this.rebuildObjectCollisionMap()
          this.fireTrigger(readStringProperty(target.properties, 'firesTriggerId') ?? target.properties.interaction.triggerId)
        }
        break
      }
      case 'talk': {
        const dialogue = readStringProperty(target.properties, 'dialogue')
        if (dialogue) console.log(dialogue)
        break
      }
      case 'trigger':
        this.fireTrigger(target.properties.interaction.triggerId)
        break
      case 'door':
        this.handleDoorInteraction(target)
        break
    }
  }

  private handleDoorInteraction(target: MapObject): void {
    if (target.properties.interaction?.type !== 'door') return
    if (target.properties.currentState === 'open') return

    const trigger = target.properties.trigger
    if (trigger?.type === 'signal') {
      // TODO: signal triggers should subscribe to runtime boolean signals.
      if (!this.warnedSignalDoorIds.has(target.id)) {
        this.warnedSignalDoorIds.add(target.id)
        console.warn('Signal door triggers are not implemented yet.')
      }
      return
    }

    const requiredItem = trigger?.type === 'key' ? trigger.requiredItem : 'small_key'
    const consume = trigger?.type === 'key' ? trigger.consume !== false : true
    if (!this.useInventoryItem(requiredItem, 1, consume)) return

    target.properties.currentState = 'open'
    target.properties.persistence = 'one_shot'
    this.rebuildObjectCollisionMap()
    this.fireTrigger(readStringProperty(target.properties, 'firesTriggerId'))
  }

  private collectObject(target: MapObject): void {
    const interaction = target.properties.interaction
    if (!interaction || interaction.type !== 'collect') return

    const itemType = interaction.lootType ?? readStringProperty(interaction, 'itemType')
    const amount = interaction.lootAmount ?? readNumberProperty(interaction, 'amount') ?? 1
    this.addInventoryItem(itemType ?? undefined, amount, readStringProperty(interaction, 'itemId'))

    this.collectedObjectIdsForMap(this.map.id).add(target.id)
    this.map.objects = (this.map.objects ?? []).filter((object) => object.id !== target.id)
    this.rebuildObjectCollisionMap()
    this.fireTrigger(readStringProperty(target.properties, 'firesTriggerId') ?? interaction.triggerId)
  }

  private handleEventInteraction(x: number, y: number): void {
    const event = [...this.events].reverse().find((candidate) => candidate.x === x && candidate.y === y)
    const interaction = event?.properties.interaction as Record<string, unknown> | undefined
    if (!event || !interaction) return

    if (interaction.type === 'item') {
      const itemType = typeof interaction.itemType === 'string' ? interaction.itemType : ''
      const amount = typeof interaction.amount === 'number' ? interaction.amount : 1
      const consume = interaction.consume !== false
      if (!this.useInventoryItem(itemType, amount, consume, readStringProperty(interaction, 'itemId'))) return
      this.fireTrigger(readStringProperty(interaction, 'triggerId') ?? readStringProperty(event.properties, 'firesTriggerId'))
      return
    }

    if (interaction.type === 'trigger') {
      this.fireTrigger(readStringProperty(interaction, 'triggerId') ?? readStringProperty(event.properties, 'firesTriggerId'))
    }
  }

  private fireTrigger(triggerId: string | null | undefined): void {
    if (!triggerId) return

    for (const obj of this.map.objects ?? []) {
      if (obj.properties.listener?.triggerId === triggerId) {
        this.executeListenerAction(obj, obj.properties.listener.action)
        continue
      }
      if (readStringProperty(obj.properties, 'respondsToTriggerId') === triggerId) {
        this.executeResponse(obj)
      }
    }
  }

  private addInventoryItem(itemType: string | undefined, amount: number, itemId: string | null = null): void {
    const normalizedType = normalizeItemType(itemType)
    const normalizedAmount = Math.max(1, amount || 1)
    if (normalizedType === 'rupee') {
      this.playerState.addRupees(normalizedAmount)
    } else if (normalizedType === 'heart') {
      this.playerState.heal(normalizedAmount)
    } else if (normalizedType === 'heart_container') {
      this.playerState.health.maxHalfHearts += normalizedAmount * 2
      this.playerState.heal(normalizedAmount * 2)
    } else if (normalizedType === 'small_key') {
      const scopeId = this.inventoryScopeId()
      for (let index = 0; index < normalizedAmount; index += 1) this.playerState.addSmallKey(scopeId)
    } else if (normalizedType === 'boss_key') {
      this.playerState.inventory.bossKeys[this.inventoryScopeId()] = true
    } else if (normalizedType === 'equipment') {
      this.playerState.inventory.equipment[0] = itemId || 'equipment'
    }
  }

  private useInventoryItem(itemType: string, amount: number, consume: boolean, itemId: string | null = null): boolean {
    const normalizedType = normalizeItemType(itemType)
    const normalizedAmount = Math.max(1, amount || 1)
    if (normalizedType === 'rupee') {
      if (this.playerState.inventory.rupees < normalizedAmount) return false
      if (consume) this.playerState.inventory.rupees -= normalizedAmount
      return true
    }

    if (normalizedType === 'small_key') {
      const scopeId = this.inventoryScopeId()
      const count = this.playerState.inventory.smallKeys[scopeId] ?? 0
      if (count < normalizedAmount) return false
      if (consume) {
        for (let index = 0; index < normalizedAmount; index += 1) this.playerState.useSmallKey(scopeId)
      }
      return true
    }

    if (normalizedType === 'boss_key') {
      return Boolean(this.playerState.inventory.bossKeys[this.inventoryScopeId()])
    }

    if (normalizedType === 'equipment') {
      return this.playerState.inventory.equipment.some((slot) => slot === (itemId || 'equipment'))
    }

    return true
  }

  private inventoryScopeId(): number {
    return this.map.mapGroupId ?? -this.map.id
  }

  private executeResponse(obj: MapObject): void {
    if (obj.properties.interaction?.type === 'toggle_state' && obj.properties.interaction.targetState) {
      obj.properties.currentState = obj.properties.interaction.targetState
    }

    if ((obj.properties as Record<string, unknown>).visible === false) {
      ;(obj.properties as Record<string, unknown>).visible = true
      this.startSpawnAnimation(obj)
    }

    if (obj.properties.solidOverride !== false) {
      obj.properties.solidOverride = false
    }

    this.rebuildObjectCollisionMap()
  }

  private executeListenerAction(obj: MapObject, action: string): void {
    // New stateful model: transition to targetStateId
    const targetStateId = obj.properties.listener?.targetStateId
    if (targetStateId) {
      const objectType = this.objectTypeMap.get(String(obj.objectTypeId))
      if (objectType?.config.isStateful) {
        this.applyStateTransition(obj, objectType, targetStateId)
        return
      }
    }

    // Legacy door model
    if (obj.properties.interaction?.type === 'door') {
      if (action === 'open') obj.properties.currentState = 'open'
      else if (action === 'close') obj.properties.currentState = 'closed'
      else if (action === 'toggle') obj.properties.currentState = obj.properties.currentState === 'open' ? 'closed' : 'open'
      this.rebuildObjectCollisionMap()
      return
    }

    this.executeResponse(obj)
  }

  private applyStateTransition(obj: MapObject, objectType: ObjectType, toStateId: string): void {
    obj.properties.currentState = toStateId
    this.rebuildObjectCollisionMap()
    if (obj.properties.emitter?.condition === 'on_state_change') {
      this.fireTrigger(obj.properties.emitter.triggerId)
    }
  }

  private objectBaseTileIndex(object: MapObject, objectType: ObjectType): number {
    // New stateful model: resolve sprite from stateDefs
    if (objectType.config.isStateful && objectType.config.stateDefs?.length) {
      const currentId = object.properties.currentState ?? object.properties.initialStateId ?? objectType.config.stateDefs[0].id
      const stateDef = objectType.config.stateDefs.find((s) => s.id === currentId || s.name === currentId)
      if (stateDef) return stateDef.sprite.tileIndex
    }

    // Legacy door model
    if (object.properties.interaction?.type === 'door') {
      const sprite = object.properties.states?.closed?.sprite
      if (sprite && Number.isFinite(sprite.tileIndex)) return sprite.tileIndex
    }

    const state = objectType.config.states?.find((candidate) => candidate.name === object.properties.currentState)
    return state?.tileIndex ?? objectType.config.visual.tileIndex
  }

  private startSpawnAnimation(object: MapObject): void {
    if (this.spawnAnimations.some((animation) => animation.object.id === object.id)) return
    this.spawnAnimations.push({ object, progress: 0, duration: 0.4 })
    this.rebuildObjectCollisionMap()
  }

  private handleGameOver(): void {
    const spawn = this.map.spawnPoint ?? this.respawnPoint
    this.player.setCollisionPosition(spawn.x * this.map.tileWidth, spawn.y * this.map.tileHeight)
    this.playerState.heal(this.playerState.health.maxHalfHearts)
    this.player.invincibleTimer = 0
  }

  private objectOccupiesCell(object: MapObject, x: number, y: number): boolean {
    const objectType = this.objectTypeMap.get(String(object.objectTypeId))
    if (!objectType) return false
    const spanX = objectType.config.visual.spanX ?? objectType.spanX ?? 1
    const spanY = objectType.config.visual.spanY ?? objectType.spanY ?? 1
    return x >= object.x && x < object.x + spanX && y >= object.y && y < object.y + spanY
  }

  private playerOverlapsCollectibleHitbox(object: MapObject): boolean {
    const hitboxSize = Math.min(8, this.map.tileWidth, this.map.tileHeight)
    const hitboxLeft = object.x * this.map.tileWidth + (this.map.tileWidth - hitboxSize) / 2
    const hitboxTop = object.y * this.map.tileHeight + (this.map.tileHeight - hitboxSize) / 2
    const hitboxRight = hitboxLeft + hitboxSize
    const hitboxBottom = hitboxTop + hitboxSize

    const playerLeft = this.player.collisionX
    const playerTop = this.player.collisionY
    const playerRight = playerLeft + this.player.collisionWidth
    const playerBottom = playerTop + this.player.collisionHeight

    return playerLeft < hitboxRight && playerRight > hitboxLeft && playerTop < hitboxBottom && playerBottom > hitboxTop
  }

  private collectedObjectIdsForMap(mapId: number): Set<string> {
    let ids = this.collectedObjectIdsByMap.get(mapId)
    if (!ids) {
      ids = new Set()
      this.collectedObjectIdsByMap.set(mapId, ids)
    }
    return ids
  }

  private detectCrossing(): ScreenTransitionDirection | null {
    const requestedDirection = this.requestedTransitionDirection()
    if (!requestedDirection) return null

    const mapPixelW = this.map.width * this.map.tileWidth
    const mapPixelH = this.map.height * this.map.tileHeight
    const crossEast = this.player.collisionX + this.player.collisionWidth >= mapPixelW
    const crossWest = this.player.collisionX <= 0
    const crossSouth = this.player.collisionY + this.player.collisionHeight >= mapPixelH
    const crossNorth = this.player.collisionY <= 0

    if (requestedDirection === 'east' && crossEast) return 'east'
    if (requestedDirection === 'west' && crossWest) return 'west'
    if (requestedDirection === 'south' && crossSouth) return 'south'
    if (requestedDirection === 'north' && crossNorth) return 'north'
    return null
  }

  private requestedTransitionDirection(): ScreenTransitionDirection | null {
    const left = this.input.isDown('a')
    const right = this.input.isDown('d')
    const up = this.input.isDown('w')
    const down = this.input.isDown('s')

    if (left || right) return right ? 'east' : 'west'
    if (up || down) return down ? 'south' : 'north'
    return null
  }

  private async handleCrossing(direction: ScreenTransitionDirection): Promise<void> {
    if (this.pendingTransition || this.activeTransition) return
    this.pendingTransition = true

    const mapPixelW = this.map.width * this.map.tileWidth
    const mapPixelH = this.map.height * this.map.tileHeight
    this.player.clampCollisionWithin(mapPixelW, mapPixelH)

    try {
      const neighborId = await this.resolveNeighborId(direction)
      if (!neighborId) {
        this.pendingTransition = false
        return
      }

      const neighborMap = await this.loadMap(neighborId)
      if (!neighborMap) {
        this.pendingTransition = false
        return
      }

      this.beginTransition(direction, neighborMap)
    } catch {
      this.pendingTransition = false
    }
  }

  private beginTransition(direction: ScreenTransitionDirection, toMap: LoadedMap): void {
    const fromMap = this.map
    const entry = this.computeEntryPosition(direction, toMap)
    const fromCanvas = document.createElement('canvas')
    const toCanvas = document.createElement('canvas')

    this.offscreenRenderer.renderToCanvas(fromMap, this.tileImages, this.objectTypes, fromCanvas)
    this.offscreenRenderer.renderToCanvas(toMap, this.tileImages, this.objectTypes, toCanvas)

    this.activeTransition = {
      direction,
      fromMap,
      toMap,
      playerEntryX: entry.x,
      playerEntryY: entry.y,
      playerStartX: this.player.collisionX,
      playerStartY: this.player.collisionY,
      progress: 0,
      duration: TRANSITION_DURATION_MS,
      elapsed: 0,
      fromCanvas,
      toCanvas,
    }
  }

  private computeEntryPosition(direction: ScreenTransitionDirection, toMap: LoadedMap): { x: number; y: number } {
    const mapPixelW = toMap.width * toMap.tileWidth
    const mapPixelH = toMap.height * toMap.tileHeight

    switch (direction) {
      case 'east':
        return { x: 0, y: this.player.collisionY }
      case 'west':
        return { x: mapPixelW - this.player.collisionWidth, y: this.player.collisionY }
      case 'south':
        return { x: this.player.collisionX, y: 0 }
      case 'north':
        return { x: this.player.collisionX, y: mapPixelH - this.player.collisionHeight }
    }
  }

  private transitionPlayerPosition(transition: ScreenTransition): { x: number; y: number } {
    const fromW = transition.fromMap.width * transition.fromMap.tileWidth
    const fromH = transition.fromMap.height * transition.fromMap.tileHeight
    const eased = easeInOut(transition.progress)
    let targetX = transition.playerEntryX
    let targetY = transition.playerEntryY

    if (transition.direction === 'east') targetX += fromW
    if (transition.direction === 'west') targetX -= fromW
    if (transition.direction === 'south') targetY += fromH
    if (transition.direction === 'north') targetY -= fromH

    return {
      x: transition.playerStartX + (targetX - transition.playerStartX) * eased - this.player.collisionOffsetX,
      y: transition.playerStartY + (targetY - transition.playerStartY) * eased - this.player.collisionOffsetY,
    }
  }

  private async resolveNeighborId(direction: ScreenTransitionDirection): Promise<number | null> {
    if (this.map.mapGroupId === null || this.map.gridCol === null || this.map.gridRow === null) return null

    const key: NeighborCacheKey = `${this.map.mapGroupId}:${this.map.gridCol}:${this.map.gridRow}`
    let neighbors = this.neighborCache.get(key)
    if (!neighbors) {
      const response = await this.fetchJson<GroupNeighbors>(
        `/api/map-groups/${this.map.mapGroupId}/neighbors?col=${this.map.gridCol}&row=${this.map.gridRow}`,
      )
      if (!response) return null
      neighbors = response
      this.neighborCache.set(key, neighbors)
    }

    return neighbors[direction]?.mapId ?? null
  }

  private async loadMap(mapId: number): Promise<LoadedMap | null> {
    const cached = this.mapCache.get(mapId)
    if (cached) return cached

    const map = await this.fetchJson<LoadedMap>(`/api/maps/${mapId}`)
    if (map) {
      const collectedIds = this.collectedObjectIdsByMap.get(map.id)
      if (collectedIds && collectedIds.size > 0) {
        map.objects = (map.objects ?? []).filter((object) => !collectedIds.has(object.id))
      }
      const events = await this.fetchJson<MapEvent[]>(`/api/maps/${map.id}/events`)
      this.eventCache.set(map.id, cloneEvents(events ?? []))
      this.mapCache.set(map.id, map)
    }
    return map
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const response = await fetch(url, {
      headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : undefined,
    })
    if (!response.ok) return null
    return (await response.json()) as T
  }
}

function cloneLoadedMap<T extends LoadedMap>(map: T): T {
  return structuredClone(map)
}

function cloneEvents(events: MapEvent[]): MapEvent[] {
  return structuredClone(events)
}

function directionDelta(direction: Direction): { x: number; y: number } {
  switch (direction) {
    case 'left':
      return { x: -1, y: 0 }
    case 'right':
      return { x: 1, y: 0 }
    case 'up':
      return { x: 0, y: -1 }
    case 'down':
      return { x: 0, y: 1 }
  }
}

function spawnDropOffset(progress: number, tileHeight: number): number {
  const t = Math.max(0, Math.min(1, progress))
  return t < 0.7
    ? -(1 - t / 0.7) * tileHeight
    : Math.sin(((t - 0.7) / 0.3) * Math.PI) * tileHeight * 0.2
}

function readStringProperty(properties: unknown, key: string): string | null {
  const value = (properties as Record<string, unknown> | null)?.[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumberProperty(properties: unknown, key: string): number | null {
  const value = (properties as Record<string, unknown> | null)?.[key]
  return typeof value === 'number' ? value : null
}

function normalizeItemType(itemType: string | undefined | null): string {
  const normalized = String(itemType ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (normalized === 'key' || normalized === 'smallkey' || normalized === 'dungeon_key') return 'small_key'
  if (normalized === 'bosskey') return 'boss_key'
  if (normalized === 'rubie' || normalized === 'rupees') return 'rupee'
  if (normalized === 'heart_piece' || normalized === 'heartpiece') return 'heart'
  return normalized
}
