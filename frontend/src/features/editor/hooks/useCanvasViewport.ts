import { useCallback, useEffect, useRef, useState, type MouseEvent, type WheelEvent } from 'react'

type UseCanvasViewportOptions = {
  contentWidth: number
  contentHeight: number
  minZoom?: number
  maxZoom?: number
  fitScale?: number
  zoomStep?: number
}

type PanStart = {
  x: number
  y: number
  panX: number
  panY: number
}

export function useCanvasViewport({
  contentWidth,
  contentHeight,
  minZoom = 0.25,
  maxZoom = 8,
  fitScale = 0.9,
  zoomStep = 0.25,
}: UseCanvasViewportOptions) {
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [panning, setPanning] = useState(false)
  const [panStart, setPanStart] = useState<PanStart | null>(null)

  const clampPan = useCallback(
    (nextX: number, nextY: number, nextZoom = zoom) => {
      const viewport = viewportRef.current
      if (!viewport || contentWidth <= 0 || contentHeight <= 0) {
        return { x: nextX, y: nextY }
      }

      const scaledWidth = contentWidth * nextZoom
      const scaledHeight = contentHeight * nextZoom
      const minVisibleX = Math.min(viewport.clientWidth * 0.8, scaledWidth * 0.8)
      const minVisibleY = Math.min(viewport.clientHeight * 0.8, scaledHeight * 0.8)

      return {
        x: Math.min(viewport.clientWidth - minVisibleX, Math.max(minVisibleX - scaledWidth, nextX)),
        y: Math.min(viewport.clientHeight - minVisibleY, Math.max(minVisibleY - scaledHeight, nextY)),
      }
    },
    [contentHeight, contentWidth, zoom],
  )

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || contentWidth <= 0 || contentHeight <= 0) {
      return
    }

    const nextZoom = Math.max(
      minZoom,
      Math.min(maxZoom, Math.min((viewport.clientWidth * fitScale) / contentWidth, (viewport.clientHeight * fitScale) / contentHeight)),
    )
    setZoom(nextZoom)
    setPanX((viewport.clientWidth - contentWidth * nextZoom) / 2)
    setPanY((viewport.clientHeight - contentHeight * nextZoom) / 2)
  }, [contentHeight, contentWidth, fitScale, maxZoom, minZoom])

  useEffect(() => {
    fitToView()
  }, [fitToView])

  const updateZoom = useCallback(
    (nextZoom: number) => {
      const viewport = viewportRef.current
      if (!viewport || contentWidth <= 0 || contentHeight <= 0) {
        return
      }

      const clampedZoom = Math.min(maxZoom, Math.max(minZoom, nextZoom))
      const centerX = viewport.clientWidth / 2
      const centerY = viewport.clientHeight / 2
      const contentX = (centerX - panX) / zoom
      const contentY = (centerY - panY) / zoom
      const nextPan = clampPan(centerX - contentX * clampedZoom, centerY - contentY * clampedZoom, clampedZoom)

      setZoom(clampedZoom)
      setPanX(nextPan.x)
      setPanY(nextPan.y)
    },
    [clampPan, contentHeight, contentWidth, maxZoom, minZoom, panX, panY, zoom],
  )

  const clientToContentPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = viewportRef.current?.getBoundingClientRect()
      if (!rect) {
        return null
      }

      return {
        x: (clientX - rect.left - panX) / zoom,
        y: (clientY - rect.top - panY) / zoom,
      }
    },
    [panX, panY, zoom],
  )

  const startPan = useCallback(
    (event: MouseEvent<Element>) => {
      event.preventDefault()
      setPanning(true)
      setPanStart({ x: event.clientX, y: event.clientY, panX, panY })
    },
    [panX, panY],
  )

  const movePan = useCallback(
    (event: MouseEvent<Element>) => {
      if (!panStart) {
        return false
      }

      const nextPan = clampPan(panStart.panX + (event.clientX - panStart.x), panStart.panY + (event.clientY - panStart.y))
      setPanX(nextPan.x)
      setPanY(nextPan.y)
      return true
    },
    [clampPan, panStart],
  )

  const stopPan = useCallback(() => {
    setPanning(false)
    setPanStart(null)
  }, [])

  const handleWheelZoom = useCallback(
    (event: WheelEvent<Element>) => {
      event.preventDefault()
      updateZoom(zoom + (event.deltaY < 0 ? zoomStep : -zoomStep))
    },
    [updateZoom, zoom, zoomStep],
  )

  return {
    viewportRef,
    zoom,
    panX,
    panY,
    panning,
    fitToView,
    updateZoom,
    clientToContentPoint,
    startPan,
    movePan,
    stopPan,
    handleWheelZoom,
  }
}
