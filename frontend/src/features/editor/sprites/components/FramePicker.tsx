import { Box, Tooltip } from '@mui/material'
import PanToolIcon from '@mui/icons-material/PanTool'
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank'
import GridOnIcon from '@mui/icons-material/GridOn'
import HighlightAltIcon from '@mui/icons-material/HighlightAlt'
import BrushIcon from '@mui/icons-material/Brush'
import InvertColorsIcon from '@mui/icons-material/InvertColors'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import FitScreenIcon from '@mui/icons-material/FitScreen'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { samplePixelColor } from '../utils/colorRemoval'
import type { SpriteFrame, SpriteState } from '../types/sprite'
import type { SelectionMode } from '../hooks/useFrameSelection'
import { useFrameSelection } from '../hooks/useFrameSelection'
import { getSpriteFrameSourceRect, TAG_COLORS } from '../types/sprite'
import {
  EditorToolbar,
  EditorToolbarButton,
  EditorToolbarLabel,
  EditorToolbarSeparator,
} from '../../components/EditorToolbar'

type FramePickerProps = {
  imageUrl: string
  baseFrameWidth: number
  baseFrameHeight: number
  imageNaturalWidth: number
  imageNaturalHeight: number
  columns: number
  rows: number
  states: SpriteState[]
  activeStateId: string
  selectionMode: SelectionMode
  blockedColors: string[]
  onSetSelectionMode: (mode: SelectionMode) => void
  onSetActiveState: (id: string) => void
  onAddFrame: (stateId: string, frame: SpriteFrame) => void
  onRemoveFrame: (stateId: string, frameIndex: number) => void
  onAddBlockedColor: (color: string) => void
}

function framesMatch(left: SpriteFrame, right: SpriteFrame) {
  return (
    left.col === right.col &&
    left.row === right.row &&
    left.spanX === right.spanX &&
    left.spanY === right.spanY &&
    left.offsetX === right.offsetX &&
    left.offsetY === right.offsetY &&
    left.pixelX === right.pixelX &&
    left.pixelY === right.pixelY &&
    left.pixelW === right.pixelW &&
    left.pixelH === right.pixelH
  )
}

function getDisplayRect(frame: SpriteFrame, baseFrameWidth: number, baseFrameHeight: number) {
  const src = getSpriteFrameSourceRect(frame, baseFrameWidth, baseFrameHeight)
  return { x: src.x, y: src.y, w: src.width, h: src.height, free: frame.pixelX != null }
}

export function FramePicker({
  imageUrl,
  baseFrameWidth,
  baseFrameHeight,
  imageNaturalWidth,
  imageNaturalHeight,
  columns,
  rows,
  states,
  activeStateId,
  selectionMode,
  blockedColors,
  onSetSelectionMode,
  onAddFrame,
  onRemoveFrame,
  onAddBlockedColor,
}: FramePickerProps) {
  const sheetContainerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const activeState = states.find((state) => state.id === activeStateId) ?? null
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(true)

  // Keep an offscreen canvas in sync with the imageUrl for pixel sampling
  useEffect(() => {
    if (!imageUrl) {
      offscreenRef.current = null
      return
    }
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        offscreenRef.current = canvas
      }
    }
    img.src = imageUrl
  }, [imageUrl])
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null)

  const toggleFrame = (frame: SpriteFrame) => {
    if (!activeState) {
      return
    }

    const existingIndex = activeState.frames.findIndex((existing) => framesMatch(existing, frame))
    if (existingIndex !== -1) {
      onRemoveFrame(activeState.id, existingIndex)
      return
    }

    onAddFrame(activeState.id, frame)
  }

  const { start, move, end, dragRect } = useFrameSelection({
    mode: selectionMode,
    zoom,
    baseFrameWidth,
    baseFrameHeight,
    columns,
    rows,
    onFrameSelected: toggleFrame,
  })

  const clampPan = (nextX: number, nextY: number) => {
    const viewport = sheetContainerRef.current
    if (!viewport) {
      return { x: nextX, y: nextY }
    }

    const scaledWidth = imageNaturalWidth * zoom
    const scaledHeight = imageNaturalHeight * zoom
    const minVisibleX = Math.min(viewport.clientWidth * 0.8, scaledWidth * 0.8)
    const minVisibleY = Math.min(viewport.clientHeight * 0.8, scaledHeight * 0.8)

    return {
      x: Math.min(viewport.clientWidth - minVisibleX, Math.max(minVisibleX - scaledWidth, nextX)),
      y: Math.min(viewport.clientHeight - minVisibleY, Math.max(minVisibleY - scaledHeight, nextY)),
    }
  }

  const zoomFit = useCallback(() => {
    const viewport = sheetContainerRef.current
    if (!viewport || imageNaturalWidth === 0) {
      return
    }

    const fittedZoom = Math.max(0.25, Math.min(8, (viewport.clientWidth * 0.9) / imageNaturalWidth))
    setZoom(fittedZoom)
    setPanX((viewport.clientWidth - imageNaturalWidth * fittedZoom) / 2)
    setPanY((viewport.clientHeight - imageNaturalHeight * fittedZoom) / 2)
  }, [imageNaturalHeight, imageNaturalWidth])

  useEffect(() => {
    zoomFit()
  }, [zoomFit])

  const updateZoom = (nextZoom: number) => {
    const viewport = sheetContainerRef.current
    if (!viewport) {
      return
    }

    const clampedZoom = Math.min(8, Math.max(0.25, nextZoom))
    const centerX = viewport.clientWidth / 2
    const centerY = viewport.clientHeight / 2
    const imageX = (centerX - panX) / zoom
    const imageY = (centerY - panY) / zoom
    const nextPan = clampPan(centerX - imageX * clampedZoom, centerY - imageY * clampedZoom)
    setZoom(clampedZoom)
    setPanX(nextPan.x)
    setPanY(nextPan.y)
  }

  const getLocalPoint = (event: React.MouseEvent | React.WheelEvent) => {
    const rect = sheetContainerRef.current?.getBoundingClientRect()
    if (!rect) {
      return null
    }

    const x = (event.clientX - rect.left - panX) / zoom
    const y = (event.clientY - rect.top - panY) / zoom
    if (x < 0 || y < 0 || x > imageNaturalWidth || y > imageNaturalHeight) {
      return null
    }
    return { x: Math.max(0, x), y: Math.max(0, y) }
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    if (selectionMode === 'pan') {
      setPanning(true)
      setPanStart({ x: event.clientX, y: event.clientY, panX, panY })
      return
    }

    if (selectionMode === 'eyedropper') {
      const local = getLocalPoint(event)
      if (local && offscreenRef.current) {
        const color = samplePixelColor(offscreenRef.current, local.x, local.y)
        if (color && !blockedColors.includes(color)) {
          onAddBlockedColor(color)
        }
      }
      return
    }

    const local = getLocalPoint(event)
    if (local) {
      start({ x: local.x * zoom, y: local.y * zoom })
    }
  }

  const handleMouseMove = (event: React.MouseEvent) => {
    if (selectionMode === 'pan' && panStart) {
      const nextPan = clampPan(panStart.panX + (event.clientX - panStart.x), panStart.panY + (event.clientY - panStart.y))
      setPanX(nextPan.x)
      setPanY(nextPan.y)
      return
    }

    const local = getLocalPoint(event)
    if (local) {
      move({ x: local.x * zoom, y: local.y * zoom })
    }
  }

  const handleMouseUp = () => {
    setPanning(false)
    setPanStart(null)
    end()
  }

  const handleWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault()
      updateZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25))
      return
    }

    const nextPan = clampPan(panX - event.deltaX, panY - event.deltaY)
    setPanX(nextPan.x)
    setPanY(nextPan.y)
  }

  const allFrameOverlays = useMemo(
    () =>
      states.flatMap((state) =>
        state.frames.map((frame, index) => {
          const rect = getDisplayRect(frame, baseFrameWidth, baseFrameHeight)
          const color = TAG_COLORS[state.tag]
          const active = state.id === activeStateId
          return (
            <Box
              key={`${state.id}-${index}`}
              onClick={() => {
                if (active) {
                  onRemoveFrame(state.id, index)
                }
              }}
              sx={{
                position: 'absolute',
                left: rect.x,
                top: rect.y,
                width: rect.w,
                height: rect.h,
                background: `${color}${active ? '73' : '33'}`,
                border: `1px solid ${color}${active ? 'cc' : '66'}`,
                pointerEvents: active ? 'auto' : 'none',
                cursor: 'pointer',
                transition: 'background 120ms',
                '&:hover': { background: `${color}99` },
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 1,
                  left: 1,
                  background: color,
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: '1px 3px',
                  borderRadius: '2px',
                  fontFamily: 'inherit',
                }}
              >
                {index + 1}
              </Box>
            </Box>
          )
        }),
      ),
    [activeStateId, baseFrameHeight, baseFrameWidth, onRemoveFrame, states],
  )

  return (
    <Box
      sx={{
        minWidth: 0,
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        px: 1.5,
        pt: 1.5,
      }}
    >
      <EditorToolbar sx={{ alignSelf: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1.25 }}>
          {([
            ['pan', <PanToolIcon />, 'Pan'],
            ['single', <CheckBoxOutlineBlankIcon />, 'Single cell'],
            ['drag', <HighlightAltIcon />, 'Drag region'],
            ['free', <BrushIcon />, 'Free draw'],
            ['eyedropper', <InvertColorsIcon />, 'Remove color'],
          ] as Array<[SelectionMode, ReactNode, string]>).map(([mode, icon, title]) => (
            <Tooltip key={String(mode)} title={title} placement="bottom">
              <Box sx={{ display: 'inline-flex' }}>
                <EditorToolbarButton icon={icon} label={title} active={selectionMode === mode} onClick={() => onSetSelectionMode(mode)} />
              </Box>
            </Tooltip>
          ))}
        </Box>

        <EditorToolbarSeparator />

        <Box sx={{ display: 'flex' }}>
          <Tooltip title={showGrid ? 'Hide grid' : 'Show grid'} placement="bottom">
            <Box sx={{ display: 'inline-flex' }}>
              <EditorToolbarButton icon={<GridOnIcon />} label={showGrid ? 'Hide grid' : 'Show grid'} active={showGrid} onClick={() => setShowGrid((value) => !value)} />
            </Box>
          </Tooltip>
        </Box>

        <EditorToolbarSeparator />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Tooltip title="Zoom out">
            <Box sx={{ display: 'inline-flex' }}>
              <EditorToolbarButton icon={<RemoveIcon />} label="Zoom out" onClick={() => updateZoom(zoom - 0.25)} />
            </Box>
          </Tooltip>
          <EditorToolbarLabel text={`${Math.round(zoom * 100)}%`} width={72} />
          <Tooltip title="Zoom in">
            <Box sx={{ display: 'inline-flex' }}>
              <EditorToolbarButton icon={<AddIcon />} label="Zoom in" onClick={() => updateZoom(zoom + 0.25)} />
            </Box>
          </Tooltip>
          <Tooltip title="Fit to view">
            <Box sx={{ display: 'inline-flex' }}>
              <EditorToolbarButton icon={<FitScreenIcon />} label="Fit to view" onClick={zoomFit} />
            </Box>
          </Tooltip>
        </Box>
      </EditorToolbar>

      <Box
        ref={sheetContainerRef}
        sx={{
          flex: 1,
          alignSelf: 'stretch',
          width: '100%',
          minHeight: 0,
          overflow: 'hidden',
          position: 'relative',
          cursor: selectionMode === 'pan' ? (panning ? 'grabbing' : 'grab') : 'crosshair',
          background: '#080c12',
          backgroundImage: `
            linear-gradient(45deg, rgba(255,255,255,0.018) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(255,255,255,0.018) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.018) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.018) 75%)
          `,
          backgroundSize: '12px 12px, 12px 12px, 12px 12px, 12px 12px',
          backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
          borderRadius: '2px',
          border: '1px solid rgba(255,255,255,0.05)',
          p: 4,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {showGrid && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 1,
              pointerEvents: 'none',
              backgroundImage: `
                repeating-linear-gradient(to right, rgba(93,158,255,0.3) 0 1px, transparent 1px 100%),
                repeating-linear-gradient(to bottom, rgba(93,158,255,0.3) 0 1px, transparent 1px 100%)
              `,
              backgroundSize: `${baseFrameWidth * zoom}px ${baseFrameHeight * zoom}px`,
              backgroundPosition: `${panX}px ${panY}px`,
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            left: panX,
            top: panY,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="sprite sheet"
            draggable={false}
            style={{ display: 'block', imageRendering: 'pixelated' }}
          />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            left: panX,
            top: panY,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            userSelect: 'none',
            zIndex: 2,
          }}
        >
          {allFrameOverlays}
          {dragRect && (
            <Box
              sx={{
                position: 'absolute',
                left: dragRect.x,
                top: dragRect.y,
                width: dragRect.w,
                height: dragRect.h,
                border: selectionMode === 'free' ? '2px dashed #e8a832' : '2px solid #388bfd',
                background: selectionMode === 'free' ? 'rgba(232,168,50,0.12)' : 'rgba(56,139,253,0.15)',
                pointerEvents: 'none',
              }}
            />
          )}
        </Box>
      </Box>

    </Box>
  )
}
