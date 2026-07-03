import { useCallback, useMemo, useState } from 'react'
import type { SpriteFrame } from '../types/sprite'

export type SelectionMode = 'pan' | 'single' | 'drag' | 'free' | 'eyedropper'

type Point = { x: number; y: number }
type Cell = { col: number; row: number }

type UseFrameSelectionArgs = {
  mode: SelectionMode
  zoom: number
  baseFrameWidth: number
  baseFrameHeight: number
  columns: number
  rows: number
  onFrameSelected: (frame: SpriteFrame) => void
}

export function useFrameSelection({
  mode,
  zoom,
  baseFrameWidth,
  baseFrameHeight,
  columns,
  rows,
  onFrameSelected,
}: UseFrameSelectionArgs) {
  const [gridStart, setGridStart] = useState<Cell | null>(null)
  const [gridCurrent, setGridCurrent] = useState<Cell | null>(null)
  const [freeStart, setFreeStart] = useState<Point | null>(null)
  const [freeCurrent, setFreeCurrent] = useState<Point | null>(null)

  const snapFreeRect = useCallback((startPoint: Point, currentPoint: Point) => {
    const rawX = Math.min(startPoint.x, currentPoint.x) / zoom
    const rawY = Math.min(startPoint.y, currentPoint.y) / zoom
    const rawW = Math.abs(currentPoint.x - startPoint.x) / zoom
    const rawH = Math.abs(currentPoint.y - startPoint.y) / zoom

    return {
      x: Math.round(rawX / baseFrameWidth) * baseFrameWidth,
      y: Math.round(rawY / baseFrameHeight) * baseFrameHeight,
      w: Math.max(baseFrameWidth, Math.round(rawW / baseFrameWidth) * baseFrameWidth),
      h: Math.max(baseFrameHeight, Math.round(rawH / baseFrameHeight) * baseFrameHeight),
    }
  }, [baseFrameHeight, baseFrameWidth, zoom])

  const pointToCell = (point: Point) => {
    const col = Math.floor(point.x / (baseFrameWidth * zoom))
    const row = Math.floor(point.y / (baseFrameHeight * zoom))
    if (col < 0 || row < 0 || col >= columns || row >= rows) {
      return null
    }
    return { col, row }
  }

  const start = (point: Point) => {
    if (mode === 'single') {
      const cell = pointToCell(point)
      if (!cell) {
        return
      }
      onFrameSelected({ col: cell.col, row: cell.row, spanX: 1, spanY: 1, offsetX: 0, offsetY: 0, duration: 150 })
      return
    }

    if (mode === 'drag') {
      const cell = pointToCell(point)
      if (!cell) {
        return
      }
      setGridStart(cell)
      setGridCurrent(cell)
      return
    }

    if (mode === 'free') {
      setFreeStart(point)
      setFreeCurrent(point)
    }
  }

  const move = (point: Point) => {
    if (mode === 'drag') {
      const cell = pointToCell(point)
      if (cell) {
        setGridCurrent(cell)
      }
      return
    }

    if (mode === 'free') {
      setFreeCurrent(point)
    }
  }

  const end = () => {
    if (mode === 'drag' && gridStart && gridCurrent) {
      const col = Math.min(gridStart.col, gridCurrent.col)
      const row = Math.min(gridStart.row, gridCurrent.row)
      const spanX = Math.abs(gridCurrent.col - gridStart.col) + 1
      const spanY = Math.abs(gridCurrent.row - gridStart.row) + 1
      onFrameSelected({ col, row, spanX, spanY, offsetX: 0, offsetY: 0, duration: 150 })
    }

    if (mode === 'free' && freeStart && freeCurrent) {
      const snapped = snapFreeRect(freeStart, freeCurrent)
      onFrameSelected({
        col: 0,
        row: 0,
        spanX: 1,
        spanY: 1,
        offsetX: 0,
        offsetY: 0,
        pixelX: snapped.x,
        pixelY: snapped.y,
        pixelW: snapped.w,
        pixelH: snapped.h,
        duration: 150,
      })
    }

    setGridStart(null)
    setGridCurrent(null)
    setFreeStart(null)
    setFreeCurrent(null)
  }

  const dragRect = useMemo(() => {
    if (mode === 'drag' && gridStart && gridCurrent) {
      return {
        x: Math.min(gridStart.col, gridCurrent.col) * baseFrameWidth,
        y: Math.min(gridStart.row, gridCurrent.row) * baseFrameHeight,
        w: (Math.abs(gridCurrent.col - gridStart.col) + 1) * baseFrameWidth,
        h: (Math.abs(gridCurrent.row - gridStart.row) + 1) * baseFrameHeight,
      }
    }

    if (mode === 'free' && freeStart && freeCurrent) {
      return snapFreeRect(freeStart, freeCurrent)
    }

    return null
  }, [baseFrameHeight, baseFrameWidth, freeCurrent, freeStart, gridCurrent, gridStart, mode, snapFreeRect])

  return { start, move, end, dragRect }
}
