export class InputHandler {
  private readonly held = new Set<string>()
  private readonly justPressed = new Set<string>()
  private readonly handleKeyDown: (e: KeyboardEvent) => void
  private readonly handleKeyUp: (e: KeyboardEvent) => void

  constructor() {
    this.handleKeyDown = (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault()
      }
      if (e.key.toLowerCase() === 'k') {
        e.preventDefault()
      }
      if (!e.repeat) {
        const key = e.key.toLowerCase()
        this.held.add(key)
        this.justPressed.add(key)
      }
    }
    this.handleKeyUp = (e) => {
      this.held.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }

  isDown(key: 'w' | 'a' | 's' | 'd'): boolean {
    return this.held.has(key)
  }

  isMenuPressed(): boolean {
    if (!this.justPressed.has('backspace')) return false
    this.justPressed.delete('backspace')
    return true
  }

  isActionJustPressed(): boolean {
    if (!this.justPressed.has('k')) return false
    this.justPressed.delete('k')
    return true
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
  }
}
