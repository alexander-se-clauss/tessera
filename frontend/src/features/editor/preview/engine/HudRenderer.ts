import type { PlayerState } from './PlayerState'

export class HudRenderer {
  private readonly ctx: CanvasRenderingContext2D
  private readonly playerState: PlayerState
  private activeMapGroupId: number | null

  constructor(ctx: CanvasRenderingContext2D, playerState: PlayerState, activeMapGroupId: number | null) {
    this.ctx = ctx
    this.playerState = playerState
    this.activeMapGroupId = activeMapGroupId
  }

  setActiveMapGroupId(mapGroupId: number | null): void {
    this.activeMapGroupId = mapGroupId
  }

  render(): void {
    this.ctx.fillStyle = '#0d1117'
    this.ctx.fillRect(0, 0, 160, 16)
    this.renderHearts(2, 4, 5, 6)
    this.renderKeys()
    this.renderRupees()
  }

  private renderHearts(x: number, y: number, size: number, step: number): void {
    const visibleHearts = Math.ceil(this.playerState.health.maxHalfHearts / 2)
    for (let i = 0; i < visibleHearts; i += 1) {
      const row = Math.floor(i / 8)
      const col = i % 8
      const heartX = x + col * step
      const heartY = y + row * (size + 2)
      const filledHalves = Math.max(0, Math.min(2, this.playerState.health.currentHalfHearts - i * 2))
      this.drawHeart(heartX, heartY, size, filledHalves)
    }
  }

  private drawHeart(x: number, y: number, size: number, filledHalves: number): void {
    this.ctx.fillStyle = '#26313f'
    this.ctx.fillRect(x, y, size, size)
    if (filledHalves >= 1) {
      this.ctx.fillStyle = '#d94b4b'
      this.ctx.fillRect(x, y, Math.ceil(size / 2), size)
    }
    if (filledHalves >= 2) {
      this.ctx.fillStyle = '#d94b4b'
      this.ctx.fillRect(x + Math.ceil(size / 2), y, Math.floor(size / 2), size)
    }
  }

  private renderKeys(): void {
    if (this.activeMapGroupId == null) return
    const count = this.playerState.inventory.smallKeys[this.activeMapGroupId] ?? 0
    if (count <= 0) return
    this.ctx.fillStyle = '#d8c06a'
    this.ctx.fillRect(110, 6, 5, 1)
    this.ctx.fillRect(112, 4, 1, 5)
    this.ctx.font = '8px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(String(count), 118, 4)
  }

  private renderRupees(): void {
    this.ctx.fillStyle = '#58d7d7'
    this.ctx.fillRect(129, 6, 1, 1)
    this.ctx.fillRect(128, 7, 3, 1)
    this.ctx.fillRect(129, 8, 1, 1)
    this.ctx.font = '8px monospace'
    this.ctx.textAlign = 'right'
    this.ctx.textBaseline = 'top'
    this.ctx.fillStyle = '#d6dee8'
    this.ctx.fillText(String(this.playerState.inventory.rupees), 158, 4)
  }
}
