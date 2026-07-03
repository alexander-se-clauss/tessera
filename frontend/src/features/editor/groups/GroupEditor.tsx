import { Box } from '@mui/material'
import type { GameMap, MapGroup, Tileset } from '../model/types'
import { GroupEditorCanvas } from './GroupEditorCanvas'

type GroupEditorProps = {
  group: MapGroup
  maps: GameMap[]
  tilesets: Tileset[]
  selectedCell: { col: number; row: number } | null
  onSelectCell: (col: number, row: number) => void
}

export function GroupEditor({ group, maps, tilesets, selectedCell, onSelectCell }: GroupEditorProps) {
  return (
    <Box sx={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <GroupEditorCanvas
        group={group}
        maps={maps}
        tilesets={tilesets}
        selectedCell={selectedCell}
        onSelectCell={onSelectCell}
      />
    </Box>
  )
}
