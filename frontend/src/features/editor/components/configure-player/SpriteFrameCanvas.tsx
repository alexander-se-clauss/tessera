import { Box } from '@mui/material'
import { useEffect, useRef } from 'react'
import { applyColorRemoval } from '../../sprites/utils/colorRemoval'
import type { SpriteFrameSource } from './types'

type SpriteFrameCanvasProps = {
  frame: SpriteFrameSource | null
  scale: number
}

export function SpriteFrameCanvas({ frame, scale }: SpriteFrameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !frame) {
      return
    }

    const image = new Image()
    image.onload = () => {
      canvas.width = frame.srcW
      canvas.height = frame.srcH
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        return
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        image,
        frame.srcX,
        frame.srcY,
        frame.srcW,
        frame.srcH,
        0,
        0,
        frame.srcW,
        frame.srcH,
      )
      applyColorRemoval(ctx, frame.srcW, frame.srcH, frame.blockedColors)
    }
    image.src = frame.imageUrl
  }, [frame])

  if (!frame) {
    return null
  }

  return (
    <Box
      component="canvas"
      ref={canvasRef}
      sx={{
        display: 'block',
        width: frame.srcW * scale,
        height: frame.srcH * scale,
        imageRendering: 'pixelated',
      }}
    />
  )
}
