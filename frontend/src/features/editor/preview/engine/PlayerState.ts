export interface Inventory {
  rupees: number
  smallKeys: Record<number, number>
  bossKeys: Record<number, boolean>
  equipment: [string | null, string | null]
}

export interface Health {
  currentHalfHearts: number
  maxHalfHearts: number
}

export class PlayerState {
  inventory: Inventory = {
    rupees: 0,
    smallKeys: {},
    bossKeys: {},
    equipment: [null, null],
  }

  health: Health = {
    currentHalfHearts: 6,
    maxHalfHearts: 6,
  }

  addRupees(amount: number): void {
    this.inventory.rupees = Math.min(9999, this.inventory.rupees + amount)
  }

  addSmallKey(mapGroupId: number): void {
    this.inventory.smallKeys[mapGroupId] = (this.inventory.smallKeys[mapGroupId] ?? 0) + 1
  }

  useSmallKey(mapGroupId: number): boolean {
    const count = this.inventory.smallKeys[mapGroupId] ?? 0
    if (count <= 0) return false
    this.inventory.smallKeys[mapGroupId] = count - 1
    return true
  }

  takeDamage(halfHearts: number): void {
    this.health.currentHalfHearts = Math.max(0, this.health.currentHalfHearts - halfHearts)
  }

  heal(halfHearts: number): void {
    this.health.currentHalfHearts = Math.min(this.health.maxHalfHearts, this.health.currentHalfHearts + halfHearts)
  }

  isDead(): boolean {
    return this.health.currentHalfHearts <= 0
  }
}
