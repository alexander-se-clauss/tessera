import type { ScreenTransition } from './types'

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export class TransitionRenderer {
  render(ctx: CanvasRenderingContext2D, transition: ScreenTransition): { offsetX: number; offsetY: number } {
    const fromW = transition.fromMap.width * transition.fromMap.tileWidth
    const fromH = transition.fromMap.height * transition.fromMap.tileHeight
    const eased = easeInOut(Math.max(0, Math.min(1, transition.progress)))
    let offsetX = 0
    let offsetY = 0

    ctx.imageSmoothingEnabled = false

    switch (transition.direction) {
      case 'east':
        offsetX = eased * fromW
        ctx.drawImage(transition.fromCanvas, -offsetX, 0)
        ctx.drawImage(transition.toCanvas, fromW - offsetX, 0)
        break
      case 'west':
        offsetX = -eased * fromW
        ctx.drawImage(transition.fromCanvas, -offsetX, 0)
        ctx.drawImage(transition.toCanvas, -fromW - offsetX, 0)
        break
      case 'south':
        offsetY = eased * fromH
        ctx.drawImage(transition.fromCanvas, 0, -offsetY)
        ctx.drawImage(transition.toCanvas, 0, fromH - offsetY)
        break
      case 'north':
        offsetY = -eased * fromH
        ctx.drawImage(transition.fromCanvas, 0, -offsetY)
        ctx.drawImage(transition.toCanvas, 0, -fromH - offsetY)
        break
    }

    return { offsetX, offsetY }
  }
}
