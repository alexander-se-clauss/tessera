import type { PlayerState } from './PlayerState'

export class MenuRenderer {
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
    const ctx = this.ctx
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 16, 160, 128)

    ctx.fillStyle = 'rgba(13,17,23,0.92)'
    ctx.fillRect(20, 22, 120, 100)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.strokeRect(20.5, 22.5, 119, 99)

    ctx.font = '8px monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.fillText('PLAYER', 28, 30)

    this.renderHearts(28, 45)
    ctx.font = '7px monospace'
    ctx.fillStyle = 'rgba(214,222,232,0.82)'
    ctx.fillText(`${this.playerState.health.currentHalfHearts / 2} / ${this.playerState.health.maxHalfHearts / 2} hearts`, 28, 55)

    this.renderStats()
    this.renderEquipment()

    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.beginPath()
    ctx.moveTo(30, 108)
    ctx.lineTo(130, 108)
    ctx.stroke()

    ctx.font = '7px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText('BACKSPACE to close', 80, 112)
  }

  private renderHearts(x: number, y: number): void {
    const hearts = Math.ceil(this.playerState.health.maxHalfHearts / 2)
    for (let i = 0; i < hearts; i += 1) {
      const filledHalves = Math.max(0, Math.min(2, this.playerState.health.currentHalfHearts - i * 2))
      this.drawHeart(x + i * 8, y, 6, filledHalves)
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

  private renderStats(): void {
    const keyCount = this.activeMapGroupId == null ? 0 : this.playerState.inventory.smallKeys[this.activeMapGroupId] ?? 0
    const bossKey = this.activeMapGroupId == null ? false : this.playerState.inventory.bossKeys[this.activeMapGroupId] ?? false
    this.renderRow(28, 66, '◇ Rupees', String(this.playerState.inventory.rupees))
    this.renderRow(28, 76, '+ Keys', String(keyCount))
    this.renderRow(28, 86, '+ Boss key', bossKey ? 'Yes' : 'No')
  }

  private renderRow(x: number, y: number, label: string, value: string): void {
    this.ctx.font = '7px monospace'
    this.ctx.textAlign = 'left'
    this.ctx.fillStyle = 'rgba(214,222,232,0.78)'
    this.ctx.fillText(label, x, y)
    this.ctx.textAlign = 'right'
    this.ctx.fillStyle = '#d6dee8'
    this.ctx.fillText(value, 128, y)
  }

  private renderEquipment(): void {
    const slots = this.playerState.inventory.equipment
    for (let i = 0; i < 2; i += 1) {
      const x = i === 0 ? 49 : 83
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)'
      this.ctx.strokeRect(x + 0.5, 96.5, 28, 28)
      this.ctx.font = '8px monospace'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillStyle = 'rgba(255,255,255,0.34)'
      this.ctx.fillText(slots[i] ?? (i === 0 ? 'A' : 'B'), x + 14, 110)
      this.ctx.textBaseline = 'top'
    }
  }
}
