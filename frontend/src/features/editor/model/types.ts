export type LayerType = 'background' | 'foreground' | 'object' | 'collision' | 'event'
export type EditorTab = 'background' | 'objects' | 'events' | 'collision'
export type TileType = 'floor' | 'wall' | 'water' | 'object'
export type EventType = 'npc' | 'door' | 'teleport' | 'trigger' | 'item' | 'script' | 'warp' | 'checkpoint' | 'custom'
export type AssetType = 'environment' | 'character'
export type MapGroupType = 'world' | 'dungeon' | 'area'
export type AssetImportStatus = 'DRAFT' | 'SAVED' | 'CANCELLED'
export type TileGroupCategory = 'GROUP' | 'CHARACTER_STATE'
export type DrawMode = 'select' | 'single' | 'area' | 'erase'

export type TileCell = {
  x: number
  y: number
  tilesetId: number | null
  tileIndex: number
}

export type MapLayer = {
  id: number
  name: string
  type: LayerType
  visible: boolean
  locked: boolean
  order: number
  tiles: TileCell[]
}

export type SpawnPoint = {
  x: number
  y: number
}

export type EntryPoint = {
  mapId: number
  x: number
  y: number
}

export type CollisionBox = {
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export type PlayerConfig = {
  spriteId: number
  moveSpeed: number
  collisionBox: CollisionBox
  mirrorMovements?: MirrorMovements
}

export type MirrorMovements = {
  leftToRight: boolean
  rightToLeft: boolean
}

export type MapGroup = {
  id: number
  projectId: number
  name: string
  type: MapGroupType
  isOverworld: boolean
  minCols: number
  minRows: number
  createdAt: string
  updatedAt: string
}

export type GroupNeighborCell = {
  mapId: number
  mapName: string
  col: number
  row: number
}

export type GroupNeighbors = {
  north: GroupNeighborCell | null
  south: GroupNeighborCell | null
  east: GroupNeighborCell | null
  west: GroupNeighborCell | null
}

export type Project = {
  id: number
  ownerId: number
  name: string
  description: string | null
  entryPoint: EntryPoint | null
  playerConfig: PlayerConfig | null
  overworldGroupId: number | null
  createdAt: string
  updatedAt: string
}

export type GameMap = {
  id: number
  projectId: number
  name: string
  width: number
  height: number
  tileWidth: number
  tileHeight: number
  layers: MapLayer[]
  objects: MapObject[]
  spawnPoint: SpawnPoint | null
  mapGroupId: number | null
  gridCol: number | null
  gridRow: number | null
  createdAt: string
  updatedAt: string
}

export type MapObject = {
  id: string
  objectTypeId: string
  x: number
  y: number
  properties: ObjectInstanceProperties
}

export type Tileset = {
  id: number
  projectId: number
  name: string
  imageUrl: string
  assetType: AssetType
  type?: 'background' | 'object'
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
  composedWidth?: number
  composedHeight?: number
  margin: number
  spacing: number
  sourceImportId: number | null
  metadata?: Record<string, unknown>
  tileMap?: Record<string, ComposedTileMetadata>
  tiles: TilesetTile[]
  groups: TileGroup[]
  createdAt: string
  updatedAt: string
}

export type ComposedTileMetadata = {
  sourceRef?: string
  animated?: boolean
  frameCount?: number
  frameDuration?: number
  frameSlots?: Array<{ col: number; row: number }>
}

export type TileHitbox = {
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export type TileMetadata = {
  tileType: TileType
  solid: boolean
  hitbox?: TileHitbox
  groupId?: number
  groupName?: string
  groupCategory?: string
  groupX?: number
  groupY?: number
  defaultSolid?: boolean
  defaultCollision?: string
}

export type TilesetTile = {
  id: number
  extractedTileId: number
  index: number
  imageUrl: string
  metadata: TileMetadata
}

export type TileRef = {
  tileId: number
  x: number
  y: number
}

export type TileGroup = {
  id: number | string
  name: string
  type: AssetType | TileType | 'object' | string
  category?: TileGroupCategory
  tileRefs?: TileRef[]
  tiles?: string[]
  solid?: boolean
  system?: boolean
  metadata?: Record<string, unknown>
  orderIndex?: number
}

export type SourceOccurrence = {
  x: number
  y: number
}

export type ExtractedTile = {
  id: number
  index: number
  hash: string
  imageUrl: string
  sourceOccurrences: SourceOccurrence[]
}

export type AssetImport = {
  importId: number
  projectId: number
  name: string
  assetType: AssetType
  status: AssetImportStatus
  tileWidth: number
  tileHeight: number
  sourceImageUrl: string
  metadata: Record<string, unknown>
  tiles: ExtractedTile[]
  groups: TileGroup[]
}

export type IconTile = {
  tilesetId: number | null
  tileIndex: number
}

export type MapEvent = {
  id: number
  mapId: number
  name: string
  x: number
  y: number
  type: EventType
  iconTile: IconTile | null
  properties: Record<string, unknown>
  objectTypeId: string | null
  createdAt: string
  updatedAt: string
}

export type ObjectTypeCategory = 'item' | 'decoration' | 'hazard' | 'interactive'
export type MovementPattern = 'push_once' | 'push_infinite' | 'patrol' | 'bounce'
export type MovementDirection = 'horizontal' | 'vertical' | 'any'
export type InteractionType = 'toggle_state' | 'collect' | 'talk' | 'trigger' | 'door'
export type ObjectKind = 'object' | 'door'
export type DoorStateName = 'closed' | 'open'
export type DoorCollision = 'solid' | 'passable'
export type DoorPersistence = 'one_shot' | 'held'
export type DoorSpriteRef = {
  tilesetId?: number | null
  tileIndex: number
}
export type DoorStates = {
  closed: { sprite: DoorSpriteRef; collision: 'solid' }
}
export type DoorTrigger =
  | { type: 'key'; requiredItem: string; consume: boolean }
  | { type: 'signal'; signalId: string }
export type ObjectInteraction =
  | {
      type: 'collect'
      lootType?: string
      lootAmount?: number
      triggerId?: string
      itemId?: string
    }
  | {
      type: 'toggle_state'
      targetState?: string
      triggerId?: string
    }
  | {
      type: 'talk'
      triggerId?: string
    }
  | {
      type: 'trigger'
      triggerId?: string
    }
  | {
      type: 'door'
    }

export type AnimFrame = { tileIndex: number; duration: number }
export type ObjectStateConfig = {
  name: string
  tileIndex: number
  animation?: { frames: AnimFrame[]; loop: boolean }
}
export type ObjectTypeConfig = {
  visual: { tileIndex: number; spanX: number; spanY: number }
  objectKind?: ObjectKind
  animation?: { frames: AnimFrame[]; loop: boolean }
  states?: ObjectStateConfig[]
  defaultState?: string
  defaultSolid: boolean
  isStateful?: boolean
  stateDefs?: ObjectStateDef[]
  stateTransitions?: ObjectStateTransition[]
}
export type PushDirections = {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

// Condition under which an object broadcasts its trigger ID.
export type TriggerCondition = 'on_pushed' | 'on_touched' | 'on_interact' | 'on_state_change'

export type TriggerEmitter = {
  triggerId: string       // unique per map
  condition: TriggerCondition
}

export type TriggerListener = {
  triggerId: string       // references an emitter on the same map
  targetStateId?: string  // stateful objects: transition to this state on trigger
  action?: string         // deprecated — kept for legacy door objects
}

// Stateful object model (type-level, defined at import).
// v1: one static sprite per state; future: extend sprite to frames without migration.
export type ObjectStateDef = {
  id: string
  name: string
  sprite: { tileIndex: number; x?: number; y?: number }
  collision: 'solid' | 'passable'
}

export type ObjectStateTransitionCondition = 'on_interact' | 'on_touched' | 'on_pushed' | 'on_trigger'

export type ObjectStateTransition = {
  id: string
  fromStateId: string
  toStateId: string
  condition: ObjectStateTransitionCondition
}

export type ObjectInstanceProperties = {
  objectTypeId: string
  currentState?: string | null
  visible?: boolean | null
  states?: DoorStates
  initialState?: DoorStateName
  trigger?: DoorTrigger
  persistence?: DoorPersistence
  movement?: {
    pattern: MovementPattern
    direction?: MovementDirection
    speed?: number
    patrolDistance?: number
  } | null
  interaction?: ObjectInteraction | null
  solidOverride?: boolean | null
  // Push direction restriction: only meaningful when movement.pattern is a pushable type.
  // Absent means all directions are allowed.
  pushDirections?: PushDirections
  // Emitter: broadcasts triggerId when condition fires.
  emitter?: TriggerEmitter
  // Listener: reacts to a trigger broadcast with an action.
  listener?: TriggerListener
  // Stateful instance config (only meaningful when objectType.config.isStateful).
  initialStateId?: string
  resetBehavior?: 'never' | 'on_room_exit' | 'on_respawn'
}
export type ObjectType = {
  id: string
  projectId: number
  tilesetId: number
  name: string
  category: ObjectTypeCategory
  spanX: number
  spanY: number
  config: ObjectTypeConfig
  createdAt: string
  updatedAt: string
}
export type ObjectTypeRequest = {
  name: string
  category: ObjectTypeCategory
  tilesetId: number
  spanX?: number
  spanY?: number
  config: ObjectTypeConfig
}
export type SelectedCell = {
  x: number
  y: number
}

export type SelectedArea = {
  start: SelectedCell
  end: SelectedCell
}

export type ProjectRequest = {
  name: string
  description?: string
  entryPoint?: EntryPoint | null
  playerConfig?: PlayerConfig | null
  overworldGroupId?: number | null
}

export type MapGroupRequest = {
  name: string
  type: MapGroupType
  isOverworld: boolean
  minCols?: number
  minRows?: number
}

export type AssignMapToGroupRequest = {
  mapGroupId: number | null
  gridCol: number | null
  gridRow: number | null
}

export type MapCreateRequest = {
  name: string
  width?: number
  height?: number
  tileWidth?: number
  tileHeight?: number
  layers?: MapLayer[]
  objects?: MapObject[]
  mapGroupId?: number | null
}

export type MapUpdateRequest = {
  name: string
  width: number
  height: number
  tileWidth: number
  tileHeight: number
  layers: MapLayer[]
  objects: MapObject[]
  spawnPoint: SpawnPoint | null
}

export type TilesetRequest = {
  name: string
  type?: 'background' | 'object'
  imageUrl?: string
  assetType?: AssetType
  tileWidth: number
  tileHeight: number
  columns?: number
  rows?: number
  margin?: number
  spacing?: number
  metadata?: Record<string, unknown>
}

export type TilesetGroupRequest = {
  name?: string
  width?: number
  height?: number
  type?: TileType | 'object' | string
  orderIndex?: number
  metadata?: Record<string, unknown>
}

export type AssignTileToGroupRequest = {
  tilesetId: number
  groupId: string
  projectId: number
  sourceImage: File | Blob
  tile: AddTilesRequest['tiles'][number]
}

export type RestitchTilesetTileRequest = {
  tilesetId: number
  projectId: number
  col: number
  row: number
  sourceImage: File | Blob
  tile: AddTilesRequest['tiles'][number]
}

export type MoveTileToTilesetGroupRequest = {
  sourceTilesetId: number
  sourceGroupId: string
  projectId: number
  col: number
  row: number
  targetTilesetId: number
  targetGroupId: string
  duplicate?: boolean
}

export type AddTilesRequest = {
  tilesetId: number
  sourceImage: File | Blob
  tiles: Array<{
    clientId: string
    sourceX: number
    sourceY: number
    width: number
    height: number
    blockedColors?: string[]
    deletedPixels?: string[]
    animated?: boolean
    frameDuration?: number
    frames?: Array<{ sourceX: number; sourceY: number; width: number; height: number; blockedColors?: string[]; deletedPixels?: string[] }> | null
  }>
}

export type AddTilesResponse = {
  tilesetId: number
  composedImageUrl: string
  addedTiles: Array<{ clientId: string; col: number; row: number; frameSlots?: Array<{ col: number; row: number }> }>
  newComposedHeight: number
  newRows: number
}

export type AssetImportUploadRequest = {
  projectId: number
  name: string
  assetType: AssetType
  file: File
}

export type SaveTilesetRequest = {
  tilesetName: string
  groups: {
    name: string
    type: AssetType
    tileRefs: TileRef[]
    metadata: Record<string, unknown>
  }[]
  characterStates: {
    state: string
    tileRefs: TileRef[]
    metadata: Record<string, unknown>
  }[]
}

export type EventRequest = {
  name: string
  x: number
  y: number
  type: EventType
  iconTile: IconTile | null
  properties: Record<string, unknown>
  objectTypeId?: string | null
}
