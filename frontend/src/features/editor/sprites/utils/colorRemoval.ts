/**
 * Parses a lowercase hex color string (#rrggbb) into r/g/b components.
 */
function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return null
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
}

/**
 * Samples the pixel at (px, py) from an offscreen canvas and returns a hex
 * string, or null if the pixel is fully transparent or out of bounds.
 */
export function samplePixelColor(offscreen: HTMLCanvasElement, px: number, py: number): string | null {
  const ctx = offscreen.getContext('2d')
  if (!ctx) return null
  const x = Math.floor(px)
  const y = Math.floor(py)
  if (x < 0 || y < 0 || x >= offscreen.width || y >= offscreen.height) return null
  const [r, g, b, a] = ctx.getImageData(x, y, 1, 1).data
  if (a === 0) return null
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Iterates over every pixel in the canvas context and sets alpha = 0 for any
 * pixel whose RGB is within `tolerance` of a blocked color.
 *
 * Call this after drawing the sprite frame but before the canvas is displayed.
 * Tolerance is per-channel (not Euclidean), matching typical "magic wand" UX.
 */
export function applyColorRemoval(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  blockedColors: string[],
  tolerance = 12,
): void {
  if (blockedColors.length === 0 || width === 0 || height === 0) return

  const blocked = blockedColors.map(parseHex).filter(Boolean) as { r: number; g: number; b: number }[]
  if (blocked.length === 0) return

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue // already transparent
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    for (const color of blocked) {
      if (
        Math.abs(r - color.r) <= tolerance &&
        Math.abs(g - color.g) <= tolerance &&
        Math.abs(b - color.b) <= tolerance
      ) {
        data[i + 3] = 0
        break
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)
}
