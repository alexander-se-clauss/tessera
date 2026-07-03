import type { ReactNode } from 'react'
import type { AssetImport, AssetType, ExtractedTile, TileRef, TileType, Tileset } from '../../model/types'

export type TileHitbox = {
  offsetX: number
  offsetY: number
  width: number
  height: number
}

export type AnimationFrameRef = {
  tileId: number
  tileIndex: number
  x: number
  y: number
}

export type TileOverride = {
  tileType?: TileType
  solid?: boolean
  sourceOffsetX?: number
  sourceOffsetY?: number
  blockedColors?: string[]
  deletedPixels?: string[]
  hitbox?: TileHitbox
  collisionMask?: boolean[][]
  objectCategory?: string
  objectKind?: 'object' | 'door'
  interactionType?: string
  movementPattern?: string
  movementDirection?: string
  animationFrames?: AnimationFrameRef[]
  animationFrameTileIds?: number[]
  animationFrameDuration?: number
  animationLoop?: boolean
}

export type GroupDraft = {
  id: string
  name: string
  type: AssetType
  tileRefs: TileRef[]
  metadata: Record<string, unknown>
}

export type TilesetImportDialogProps = {
  open: boolean
  projectId: number
  projectName: string
  availableTilesets?: Tileset[]
  editingTileset?: Tileset | null
  onClose: () => void
  onImported: (tilesetId: number) => void
}

export type TilesetImportStepperProps = {
  step: number
}

export type TilesetExtractStepProps = {
  projectName: string
  assetName: string
  setAssetName: (value: string) => void
  hideAssetName?: boolean
  availableTilesets?: Tileset[]
  selectedTilesetId?: number | ''
  setSelectedTilesetId?: (value: number | '') => void
  fixedTilesetName?: string
  file: File | null
  setFile: (file: File | null) => void
  imageUrl: string
  imageNaturalWidth: number
  imageNaturalHeight: number
}

export type TilesetOrganizeCollisionStepProps = {
  allTiles: ExtractedTile[]
  approvedTiles: ExtractedTile[]
  sourceImageUrl?: string
  sourceImageWidth?: number
  sourceImageHeight?: number
  sourceGridW?: number
  sourceGridH?: number
  importWorkspace?: boolean
  sourceToolbarContent?: ReactNode
  targetSelector?: ReactNode
  crossTilesetTargets?: Array<{ tilesetId: number; tilesetName: string; groups: Array<{ id: string; name: string; width: number; height: number }> }>
  onToggleSourceRegion?: (regions: Array<{ sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }>) => void
  onCreateSourceRegionTile?: (region: { sourceX: number; sourceY: number; width: number; height: number; imageUrl: string }) => ExtractedTile
  activeGroup: GroupDraft | null
  groups: GroupDraft[]
  newGroupName: string
  setNewGroupName: (value: string) => void
  organizeSelectedTileIds: number[]
  selectedLayoutTileId: number | null
  draggedLayoutItem: { tileId: number | null; x: number; y: number } | null
  onSetActiveGroupId: (groupId: string | null) => void
  onSetSelectedLayoutTileId: (tileId: number | null) => void
  onSetDraggedLayoutItem: (item: { tileId: number | null; x: number; y: number } | null) => void
  onSetOrganizeSelectedTileIds: (tileIds: number[]) => void
  onToggleTile: (tileId: number) => void
  onAddGroup: () => void
  onDeleteGroup: (groupId: string) => void
  onAssignSelectedToGroup: () => void
  onUpdateGroupDimension: (groupId: string, key: 'width' | 'height', value: number) => void
  onUpdateGroupTileType: (groupId: string, tileType: TileType) => void
  onUpdateGroupMeta: (groupId: string, key: string, value: unknown) => void
  onUpdateTileOverride: (tileId: number, groupId: string, updates: Partial<TileOverride>) => void
  onAppendAnimationFrame?: (baseTileId: number, groupId: string, frame: AnimationFrameRef) => void
  onClearTileOverride: (tileId: number, groupId: string) => void
  onMoveLayoutItem: (source: { tileId: number | null; x: number; y: number }, target: { tileId: number | null; x: number; y: number }) => void
  onRemoveTileFromGroup: (tileId: number) => void
  onMoveTileToGroup: (tileId: number, sourceGroupId: string, targetGroupId: string) => void
  onMoveTileToTilesetGroup?: (tileId: number, sourceGroupId: string, targetTilesetId: number, targetGroupId: string) => void
  onDuplicateTileToGroup: (tileId: number, sourceGroupId: string, targetGroupId: string) => void
  onRemoveTileFromSpecificGroup: (tileId: number, groupId: string) => void
}

export type TilesetReviewStepProps = {
  importSession: AssetImport
  assetName: string
  groups: GroupDraft[]
  allTiles: ExtractedTile[]
  objectDrafts: ObjectTypeDraft[]
}

export type ObjectStateDraftDef = {
  id: string
  name: string
  sprite: { tileIndex: number; x?: number; y?: number }
  collision: 'solid' | 'passable'
}

export type ObjectStateTransitionDraft = {
  id: string
  fromStateId: string
  toStateId: string
  condition: 'on_interact' | 'on_touched' | 'on_pushed' | 'on_trigger'
}

export type ObjectTypeDraft = {
  id: string
  serverId?: string
  name: string
  category: 'item' | 'decoration' | 'hazard' | 'interactive'
  tilesetId: number
  spanX: number
  spanY: number
  config: {
    visual: { tileIndex: number; spanX: number; spanY: number }
    objectKind?: 'object' | 'door'
    animation?: { frames: Array<{ tileIndex: number; duration: number }>; loop: boolean }
    states?: Array<{ name: string; tileIndex: number; animation?: { frames: Array<{ tileIndex: number; duration: number }>; loop: boolean } }>
    defaultState?: string
    defaultSolid: boolean
    isStateful?: boolean
    stateDefs?: ObjectStateDraftDef[]
    stateTransitions?: ObjectStateTransitionDraft[]
  }
}
