import type { MapObject, ObjectType } from '../../model/types'

type ObjectTypeLookup = Map<string, ObjectType>

export class ObjectCollisionMap {
  private readonly solidCells = new Map<string, MapObject>()
  private readonly ignoredObjectIds: Set<string>

  constructor(
    objects: MapObject[],
    objectTypes: ObjectTypeLookup,
    ignoredObjectIds: Set<string> = new Set(),
  ) {
    this.ignoredObjectIds = ignoredObjectIds
    for (const obj of objects) {
      if (this.ignoredObjectIds.has(obj.id)) continue
      if (obj.properties && obj.properties.visible === false) continue

      const objectType = objectTypes.get(String(obj.objectTypeId))
      if (!objectType) continue

      const isSolid = objectIsSolid(obj, objectType)
      if (!isSolid) continue

      const spanX = objectType.config.visual.spanX ?? objectType.spanX ?? 1
      const spanY = objectType.config.visual.spanY ?? objectType.spanY ?? 1
      for (let dx = 0; dx < spanX; dx += 1) {
        for (let dy = 0; dy < spanY; dy += 1) {
          this.solidCells.set(`${obj.x + dx},${obj.y + dy}`, obj)
        }
      }
    }
  }

  isSolid(tileX: number, tileY: number): boolean {
    return this.solidCells.has(`${tileX},${tileY}`)
  }

  getSolidObjectAt(tileX: number, tileY: number): MapObject | null {
    return this.solidCells.get(`${tileX},${tileY}`) ?? null
  }

  getCollidingObjectForBox(
    boxLeft: number,
    boxTop: number,
    boxRight: number,
    boxBottom: number,
    tileW: number,
    tileH: number,
  ): MapObject | null {
    const minTileX = Math.floor(boxLeft / tileW)
    const maxTileX = Math.floor(boxRight / tileW)
    const minTileY = Math.floor(boxTop / tileH)
    const maxTileY = Math.floor(boxBottom / tileH)

    for (let y = minTileY; y <= maxTileY; y += 1) {
      for (let x = minTileX; x <= maxTileX; x += 1) {
        const obj = this.getSolidObjectAt(x, y)
        if (obj) return obj
      }
    }
    return null
  }
}

function objectIsSolid(obj: MapObject, objectType: ObjectType): boolean {
  // New stateful model: use current state's collision flag
  if (objectType.config.isStateful && objectType.config.stateDefs?.length) {
    const currentId = obj.properties.currentState ?? obj.properties.initialStateId ?? objectType.config.stateDefs[0].id
    const stateDef = objectType.config.stateDefs.find((s) => s.id === currentId || s.name === currentId)
    if (stateDef) return stateDef.collision === 'solid'
  }

  // Legacy door model
  if (obj.properties.interaction?.type === 'door') {
    return obj.properties.currentState !== 'open'
  }

  return obj.properties.solidOverride ?? objectType.config.defaultSolid
}
