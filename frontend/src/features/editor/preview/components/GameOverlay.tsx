import { useEffect, useRef, useState } from 'react'
import type { GameMap, MapEvent, ObjectType, PlayerConfig, TileHitbox, Tileset } from '../../model/types'
import type { SpriteDefinition } from '../../sprites/types/sprite'
import { applyColorRemoval } from '../../sprites/utils/colorRemoval'
import { useAppSelector } from '../../../../app/hooks'
import { selectAuthToken } from '../../../auth/model/authSlice'
import { GameEngine } from '../engine/GameEngine'
import { tileAssetKey, type TileHitboxMap, type TileImageMap } from '../engine/types'

interface GameOverlayProps {
  map: GameMap
  events: MapEvent[]
  tilesets: Tileset[]
  objectTypes: ObjectType[]
  sprite: SpriteDefinition
  spriteImageSrc: string
  spawnPoint: { x: number; y: number }
  playerConfig: PlayerConfig
  paused: boolean
  onClose: () => void
}

function computeScale(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / 160, (window.innerHeight - 32) / 144)))
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(img)
    img.src = src
  })
}

export function GameOverlay(props: GameOverlayProps) {
  const { map, events, tilesets, objectTypes, sprite, spriteImageSrc, spawnPoint, playerConfig, paused, onClose } = props

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const authToken = useAppSelector(selectAuthToken)
  const [scale, setScale] = useState(computeScale)

  useEffect(() => {
    const handleResize = () => setScale(computeScale())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    let cancelled = false
    let engine: GameEngine | null = null

    const run = async () => {
      // Load sprite sheet and apply background color removal
      const spriteImg = await loadImage(spriteImageSrc)
      const processedSprite = document.createElement('canvas')
      processedSprite.width = spriteImg.naturalWidth
      processedSprite.height = spriteImg.naturalHeight
      const spriteCtx = processedSprite.getContext('2d')!
      spriteCtx.drawImage(spriteImg, 0, 0)
      if (sprite.blockedColors.length > 0) {
        applyColorRemoval(spriteCtx, processedSprite.width, processedSprite.height, sprite.blockedColors)
      }

      // Load each individual environment tile image by tileset+index.
      const tileImages: TileImageMap = new Map()
      await Promise.all(
        tilesets.flatMap((tileset) => {
          if (tileset.tileMap && Object.keys(tileset.tileMap).length > 0) {
            return [loadImage(tileset.imageUrl).then((image) => {
              for (const key of Object.keys(tileset.tileMap ?? {})) {
                const [col, row] = key.split(',').map(Number)
                const tileIndex = row * tileset.columns + col
                const canvas = document.createElement('canvas')
                canvas.width = tileset.tileWidth
                canvas.height = tileset.tileHeight
                const ctx = canvas.getContext('2d')
                ctx?.drawImage(image, col * tileset.tileWidth, row * tileset.tileHeight, tileset.tileWidth, tileset.tileHeight, 0, 0, tileset.tileWidth, tileset.tileHeight)
                const assetKey = tileAssetKey(tileset.id, tileIndex)
                if (assetKey) tileImages.set(assetKey, canvas)
              }
            })]
          }
          return tileset.tiles.map(async (tile) => {
            const key = tileAssetKey(tileset.id, tile.index)
            if (!key) return
            const img = await loadImage(tile.imageUrl)
            tileImages.set(key, img)
          })
        }),
      )

      if (cancelled || !canvasRef.current) return

      // Use the tileset's tile dimensions for the engine — the extracted tile
      // images are authoritative over whatever tileWidth/tileHeight the map
      // was created with (they may differ if the map default was 16 but the
      // tileset uses 32×32 tiles).
      const primaryTileset = tilesets[0]
      const engineMap = primaryTileset && (primaryTileset.tileWidth !== map.tileWidth || primaryTileset.tileHeight !== map.tileHeight)
        ? { ...map, tileWidth: primaryTileset.tileWidth, tileHeight: primaryTileset.tileHeight }
        : map

      const tileHitboxMap = buildTileHitboxMap(tilesets)

      engine = new GameEngine(
        canvasRef.current,
        engineMap,
        events,
        { tilesets, objectTypes: resolveObjectTypeSolidity(objectTypes, tilesets), tileImages, tileHitboxes: tileHitboxMap },
        { authToken },
        sprite,
        processedSprite,
        spawnPoint,
        playerConfig,
      )
      engineRef.current = engine
      engine.start()
    }

    void run()

    return () => {
      cancelled = true
      engine?.stop()
      engineRef.current = null
    }
    // Props are captured at mount time — engine is not rebuilt on prop changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    if (paused) {
      engine.pause()
    } else {
      engine.resume()
    }
  }, [paused])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleEscape, { capture: true })
    return () => window.removeEventListener('keydown', handleEscape, { capture: true })
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* HUD bar */}
      <div
        style={{
          height: 32,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          background: 'rgba(0,0,0,0.7)',
          fontSize: 11,
          fontFamily: 'monospace',
          color: '#6a737d',
        }}
      >
        <span>{map.name}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#6a737d',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          width={160}
          height={144}
          tabIndex={0}
          autoFocus
          style={{
            display: 'block',
            imageRendering: 'pixelated',
            width: 160 * scale,
            height: 144 * scale,
            outline: 'none',
          }}
        />
      </div>
    </div>
  )
}

function buildTileHitboxMap(tilesets: Tileset[]): TileHitboxMap {
  const tileHitboxMap: TileHitboxMap = new Map()
  for (const tileset of tilesets) {
    const fullTile: TileHitbox = { offsetX: 0, offsetY: 0, width: tileset.tileWidth, height: tileset.tileHeight }

    if (tileset.tileMap && Object.keys(tileset.tileMap).length > 0) {
      for (const group of tileset.groups ?? []) {
        const groupSolid = Boolean(
          group.solid ??
          group.metadata?.solid ??
          (String(group.metadata?.defaultCollision ?? 'none') === 'solid' || group.type === 'wall'),
        )
        const tileOverrides = (group.metadata?.tileOverrides ?? {}) as Record<string, { solid?: boolean; hitbox?: TileHitbox; collisionMask?: boolean[] }>
        for (const [slotIndex, slot] of (group.tiles ?? []).entries()) {
          const [colRaw, rowRaw] = slot.split(',')
          const col = Number(colRaw) || 0
          const row = Number(rowRaw) || 0
          const tileIndex = row * Math.max(1, tileset.columns) + col
          const tileRef = group.tileRefs?.[slotIndex]
          const override = tileRef ? tileOverrides[String(tileRef.tileId)] : undefined
          const solid = override?.solid ?? groupSolid
          if (!solid) continue
          const key = tileAssetKey(tileset.id, tileIndex)
          if (!key) continue
          tileHitboxMap.set(key, override?.hitbox ?? hitboxFromMask(override?.collisionMask, tileset.tileWidth, tileset.tileHeight) ?? fullTile)
        }
      }
      continue
    }

    for (const tile of tileset.tiles) {
      if (!tile.metadata?.solid) continue
      const key = tileAssetKey(tileset.id, tile.index)
      if (!key) continue
      tileHitboxMap.set(key, tile.metadata.hitbox ?? fullTile)
    }
  }
  return tileHitboxMap
}

function resolveObjectTypeSolidity(objectTypes: ObjectType[], tilesets: Tileset[]): ObjectType[] {
  return objectTypes.map((objectType) => {
    if (objectType.config.defaultSolid) return objectType
    const tileset = tilesets.find((candidate) => candidate.id === objectType.tilesetId)
    if (!composedTileIsSolid(tileset, objectType.config.visual.tileIndex)) return objectType
    return {
      ...objectType,
      config: {
        ...objectType.config,
        defaultSolid: true,
      },
    }
  })
}

function composedTileIsSolid(tileset: Tileset | undefined, tileIndex: number): boolean {
  if (!tileset?.tileMap || Object.keys(tileset.tileMap).length === 0) return false
  const slot = `${tileIndex % Math.max(1, tileset.columns)},${Math.floor(tileIndex / Math.max(1, tileset.columns))}`
  for (const group of tileset.groups ?? []) {
    const slotIndex = (group.tiles ?? []).indexOf(slot)
    if (slotIndex < 0) continue
    const tileRef = group.tileRefs?.[slotIndex]
    const overrides = (group.metadata?.tileOverrides ?? {}) as Record<string, { solid?: boolean }>
    const override = tileRef ? overrides[String(tileRef.tileId)] : undefined
    return Boolean(
      override?.solid ??
      group.solid ??
      group.metadata?.solid ??
      (String(group.metadata?.defaultCollision ?? 'none') === 'solid' || group.type === 'wall' || tileset.type === 'object'),
    )
  }
  return false
}

function hitboxFromMask(mask: boolean[] | undefined, tileWidth: number, tileHeight: number): TileHitbox | null {
  if (!mask?.some(Boolean)) return null
  const maskSize = Math.sqrt(mask.length)
  if (!Number.isInteger(maskSize) || maskSize <= 0) return null
  let minX = maskSize
  let minY = maskSize
  let maxX = -1
  let maxY = -1
  mask.forEach((solid, index) => {
    if (!solid) return
    const x = index % maskSize
    const y = Math.floor(index / maskSize)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })
  if (maxX < minX || maxY < minY) return null
  const cellW = tileWidth / maskSize
  const cellH = tileHeight / maskSize
  return {
    offsetX: Math.floor(minX * cellW),
    offsetY: Math.floor(minY * cellH),
    width: Math.ceil((maxX - minX + 1) * cellW),
    height: Math.ceil((maxY - minY + 1) * cellH),
  }
}
