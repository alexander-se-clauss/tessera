export type GameplayItemType =
  | 'rupee'
  | 'heart'
  | 'small_key'
  | 'boss_key'
  | 'heart_container'
  | 'equipment'
  | 'map'
  | 'compass'
  | 'custom'

export const GAMEPLAY_ITEM_OPTIONS: Array<{ value: GameplayItemType; label: string; hasAmount: boolean }> = [
  { value: 'rupee', label: 'Rupee', hasAmount: true },
  { value: 'heart', label: 'Heart', hasAmount: true },
  { value: 'small_key', label: 'Small key', hasAmount: true },
  { value: 'boss_key', label: 'Boss key', hasAmount: false },
  { value: 'heart_container', label: 'Heart container', hasAmount: true },
  { value: 'equipment', label: 'Equipment', hasAmount: false },
  { value: 'map', label: 'Dungeon map', hasAmount: false },
  { value: 'compass', label: 'Compass', hasAmount: false },
  { value: 'custom', label: 'Custom', hasAmount: false },
]

export function itemHasAmount(itemType: string | undefined | null): boolean {
  return GAMEPLAY_ITEM_OPTIONS.find((option) => option.value === itemType)?.hasAmount ?? false
}
