import { useCallback, useMemo, useState } from 'react'
import type { SpriteFrame } from '../types/sprite'

export type SelectionMode = 'pan' | 'single' | 'drag' | 'free' | 'eyedropper'

type Point = { x: number; y: number }

type UseFrameSelectionArgs = {
  mode: SelectionMode
  baseFrameWidth: number
  baseFrameHeight: number
  imageWidth: number
  imageHeight: number
  onFrameSelected: (frame: SpriteFrame) => void
}

export function useFrameSelection({
  mode,
  baseFrameWidth,
  baseFrameHeight,
  imageWidth,
  imageHeight,
  onFrameSelected,
}: UseFrameSelectionArgs) {
  const [selectionStart, setSelectionStart] = useState<Point | null>(null)
  const [selectionCurrent, setSelectionCurrent] = useState<Point | null>(null)

  const clampSingleRect = useCallback((point: Point) => ({
    x: Math.max(0, Math.min(Math.max(0, imageWidth - baseFrameWidth), Math.floor(point.x))),
    y: Math.max(0, Math.min(Math.max(0, imageHeight - baseFrameHeight), Math.floor(point.y))),
    w: Math.min(baseFrameWidth, imageWidth),
    h: Math.min(baseFrameHeight, imageHeight),
  }), [baseFrameHeight, baseFrameWidth, imageHeight, imageWidth])

  const makeDragRect = useCallback((startPoint: Point, currentPoint: Point) => {
    const rawX = Math.min(startPoint.x, currentPoint.x)
    const rawY = Math.min(startPoint.y, currentPoint.y)
    const rawMaxX = Math.max(startPoint.x, currentPoint.x)
    const rawMaxY = Math.max(startPoint.y, currentPoint.y)
    const x = Math.max(0, Math.min(imageWidth - 1, Math.floor(rawX)))
    const y = Math.max(0, Math.min(imageHeight - 1, Math.floor(rawY)))
    const maxX = Math.max(x + 1, Math.min(imageWidth, Math.ceil(rawMaxX)))
    const maxY = Math.max(y + 1, Math.min(imageHeight, Math.ceil(rawMaxY)))

    return {
      x,
      y,
      w: Math.max(1, maxX - x),
      h: Math.max(1, maxY - y),
    }
  }, [imageHeight, imageWidth])

  const makeFrame = useCallback((rect: { x: number; y: number; w: number; h: number }): SpriteFrame => ({
    col: 0,
    row: 0,
    spanX: 1,
    spanY: 1,
    offsetX: 0,
    offsetY: 0,
    pixelX: rect.x,
    pixelY: rect.y,
    pixelW: rect.w,
    pixelH: rect.h,
    duration: 150,
  }), [])

  const start = (point: Point) => {
    if (mode === 'single' || mode === 'drag' || mode === 'free') {
      setSelectionStart(point)
      setSelectionCurrent(point)
      return
    }
  }

  const move = (point: Point) => {
    if (selectionStart && (mode === 'single' || mode === 'drag' || mode === 'free')) {
      setSelectionCurrent(point)
    }
  }

  const end = () => {
    if ((mode === 'single' || mode === 'drag' || mode === 'free') && selectionStart && selectionCurrent) {
      const rect = mode === 'single'
        ? clampSingleRect(selectionCurrent)
        : makeDragRect(selectionStart, selectionCurrent)
      onFrameSelected(makeFrame(rect))
    }

    setSelectionStart(null)
    setSelectionCurrent(null)
  }

  const dragRect = useMemo(() => {
    if (!selectionStart || !selectionCurrent) {
      return null
    }

    if (mode === 'single') {
      return clampSingleRect(selectionCurrent)
    }

    if (mode === 'drag' || mode === 'free') {
      return makeDragRect(selectionStart, selectionCurrent)
    }

    return null
  }, [clampSingleRect, makeDragRect, mode, selectionCurrent, selectionStart])

  return { start, move, end, dragRect }
}
