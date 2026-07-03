export class Camera {
  x = 0
  y = 0
  readonly viewportW: number
  readonly viewportH: number

  constructor(viewportW = 160, viewportH = 144) {
    this.viewportW = viewportW
    this.viewportH = viewportH
  }

  reset(): void {
    this.x = 0
    this.y = 0
  }

  follow(centerX: number, centerY: number, mapPixelW: number, mapPixelH: number): void {
    this.x = centerX - this.viewportW / 2
    this.y = centerY - this.viewportH / 2
    this.x = Math.max(0, Math.min(this.x, Math.max(0, mapPixelW - this.viewportW)))
    this.y = Math.max(0, Math.min(this.y, Math.max(0, mapPixelH - this.viewportH)))
  }
}
