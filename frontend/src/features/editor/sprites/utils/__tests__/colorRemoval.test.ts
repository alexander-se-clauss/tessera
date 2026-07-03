import { describe, it, expect, vi } from 'vitest'
import { applyColorRemoval, samplePixelColor } from '../colorRemoval'

// Builds a mock CanvasRenderingContext2D from a flat RGBA pixel array.
// Pixels are stored as [r, g, b, a, r, g, b, a, ...] row by row.
function makeCtx(width: number, height: number, pixels: number[]) {
  const data = new Uint8ClampedArray(pixels)
  const putImageData = vi.fn()
  const ctx = {
    getImageData: (_x: number, _y: number, w: number, h: number) => ({
      data: new Uint8ClampedArray(data.buffer.slice(0, w * h * 4)),
    }),
    putImageData: (imageData: { data: Uint8ClampedArray }) => {
      putImageData(imageData)
      data.set(imageData.data)
    },
  } as unknown as CanvasRenderingContext2D
  return { ctx, data, putImageData }
}

// Builds an HTMLCanvasElement mock for samplePixelColor tests.
function makeCanvas(width: number, height: number, pixels: number[]) {
  const data = new Uint8ClampedArray(pixels)
  const canvas = {
    width,
    height,
    getContext: () => ({
      getImageData: (x: number, y: number) => ({
        data: data.slice((y * width + x) * 4, (y * width + x) * 4 + 4),
      }),
    }),
  } as unknown as HTMLCanvasElement
  return canvas
}

// --- applyColorRemoval ---

describe('applyColorRemoval', () => {
  it('sets alpha to 0 for an exact color match', () => {
    // Single red pixel
    const { ctx, data } = makeCtx(1, 1, [255, 0, 0, 255])
    applyColorRemoval(ctx, 1, 1, ['#ff0000'], 0)
    expect(data[3]).toBe(0)
  })

  it('sets alpha to 0 when the pixel is within tolerance', () => {
    const { ctx, data } = makeCtx(1, 1, [250, 5, 3, 255]) // near #ff0000 with tolerance 12
    applyColorRemoval(ctx, 1, 1, ['#ff0000'], 12)
    expect(data[3]).toBe(0)
  })

  it('preserves pixels outside the tolerance range', () => {
    const { ctx, data } = makeCtx(1, 1, [100, 200, 50, 255]) // far from #ff0000
    applyColorRemoval(ctx, 1, 1, ['#ff0000'], 12)
    expect(data[3]).toBe(255)
  })

  it('skips pixels that are already fully transparent', () => {
    const { ctx, putImageData } = makeCtx(1, 1, [255, 0, 0, 0]) // red but alpha=0
    applyColorRemoval(ctx, 1, 1, ['#ff0000'], 0)
    // putImageData is still called but the original alpha must remain 0
    const written = putImageData.mock.calls[0]?.[0] as { data: Uint8ClampedArray } | undefined
    expect(written?.data[3]).toBe(0)
  })

  it('is a no-op when blockedColors is empty', () => {
    const { ctx, putImageData } = makeCtx(1, 1, [255, 0, 0, 255])
    applyColorRemoval(ctx, 1, 1, [], 12)
    expect(putImageData).not.toHaveBeenCalled()
  })

  it('is a no-op when width or height is 0', () => {
    const { ctx, putImageData } = makeCtx(0, 0, [])
    applyColorRemoval(ctx, 0, 0, ['#ff0000'])
    expect(putImageData).not.toHaveBeenCalled()
  })

  it('ignores invalid color strings', () => {
    const { ctx, data } = makeCtx(1, 1, [255, 0, 0, 255])
    applyColorRemoval(ctx, 1, 1, ['not-a-color'], 0)
    expect(data[3]).toBe(255)
  })

  it('removes a pixel matching any of multiple blocked colors', () => {
    // Two pixels: first matches #ff0000, second matches #0000ff
    const { ctx, data } = makeCtx(2, 1, [255, 0, 0, 255, 0, 0, 255, 255])
    applyColorRemoval(ctx, 2, 1, ['#ff0000', '#0000ff'], 0)
    expect(data[3]).toBe(0)  // first pixel removed
    expect(data[7]).toBe(0)  // second pixel removed
  })
})

// --- samplePixelColor ---

describe('samplePixelColor', () => {
  it('returns the hex color of an opaque pixel', () => {
    const canvas = makeCanvas(1, 1, [255, 128, 0, 255])
    expect(samplePixelColor(canvas, 0, 0)).toBe('#ff8000')
  })

  it('returns null for a fully transparent pixel', () => {
    const canvas = makeCanvas(1, 1, [255, 0, 0, 0])
    expect(samplePixelColor(canvas, 0, 0)).toBeNull()
  })

  it('returns null for out-of-bounds x', () => {
    const canvas = makeCanvas(1, 1, [255, 0, 0, 255])
    expect(samplePixelColor(canvas, 5, 0)).toBeNull()
  })

  it('returns null for out-of-bounds y', () => {
    const canvas = makeCanvas(1, 1, [255, 0, 0, 255])
    expect(samplePixelColor(canvas, 0, 5)).toBeNull()
  })

  it('returns null for negative coordinates', () => {
    const canvas = makeCanvas(2, 2, [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255])
    expect(samplePixelColor(canvas, -1, 0)).toBeNull()
  })
})
