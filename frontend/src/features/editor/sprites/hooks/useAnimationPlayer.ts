import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { SpriteFrame } from '../types/sprite'
import { getSpriteFrameSourceRect } from '../types/sprite'
import { applyColorRemoval } from '../utils/colorRemoval'

type AnimationOptions = {
  baseFrameWidth: number
  baseFrameHeight: number
  displayScale?: number
  blockedColors?: string[]
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) {
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  canvas.width = 0
  canvas.height = 0
  canvas.style.width = '0px'
  canvas.style.height = '0px'
}

function drawFrame(
  canvas: HTMLCanvasElement | null,
  imageEl: HTMLImageElement | null,
  frame: SpriteFrame | undefined,
  options: AnimationOptions,
) {
  if (!canvas || !imageEl || !frame) {
    clearCanvas(canvas)
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  const src = getSpriteFrameSourceRect(frame, options.baseFrameWidth, options.baseFrameHeight)
  canvas.width = src.width
  canvas.height = src.height
  canvas.style.width = `${src.width * (options.displayScale ?? 1)}px`
  canvas.style.height = `${src.height * (options.displayScale ?? 1)}px`
  ctx.clearRect(0, 0, src.width, src.height)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(imageEl, src.x, src.y, src.width, src.height, 0, 0, src.width, src.height)
  applyColorRemoval(ctx, src.width, src.height, options.blockedColors ?? [])
}

export function useAnimationPlayer(
  frames: SpriteFrame[],
  imageEl: HTMLImageElement | null,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  options: AnimationOptions,
) {
  const [playing, setPlaying] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    if (!imageEl || frames.length === 0 || currentIndex >= frames.length) {
      clearCanvas(canvas)
      return
    }

    drawFrame(canvas, imageEl, frames[currentIndex], options)
  }, [canvasRef, currentIndex, frames, imageEl, options])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!playing || frames.length === 0) {
      return
    }

    const tick = (index: number) => {
      setCurrentIndex(index)
      drawFrame(canvasRef.current, imageEl, frames[index], options)
      timerRef.current = setTimeout(() => tick((index + 1) % frames.length), frames[index].duration)
    }

    tick(currentIndex)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [canvasRef, currentIndex, frames, imageEl, options, playing])

  return { playing, setPlaying, currentIndex, setCurrentIndex }
}
