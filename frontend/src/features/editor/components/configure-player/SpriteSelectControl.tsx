import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import { Box, MenuItem, Select, Typography } from '@mui/material'
import { SpriteFrameCanvas } from './SpriteFrameCanvas'
import type { SpriteOption } from './types'

type SpriteSelectControlProps = {
  sprites: SpriteOption[]
  value: number | ''
  onChange: (value: number | '') => void
}

export function SpriteSelectControl({ sprites, value, onChange }: SpriteSelectControlProps) {
  const selectedSprite = sprites.find((sprite) => sprite.id === value) ?? null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(220,230,245,0.72)' }}>
          Player sprite
        </Typography>
        <Select
          value={value}
          onChange={(event) => onChange(event.target.value ? Number(event.target.value) : '')}
          displayEmpty
          IconComponent={KeyboardArrowDownRoundedIcon}
          renderValue={() => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1.5,
                  overflow: 'hidden',
                  bgcolor: 'rgba(255,255,255,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SpriteFrameCanvas frame={selectedSprite?.previewFrame ?? null} scale={2} />
              </Box>
              <Typography sx={{ fontSize: 15, fontWeight: 500, color: 'rgba(240,245,255,0.94)' }}>
                {selectedSprite?.name ?? 'No sprites imported yet'}
              </Typography>
            </Box>
          )}
          sx={{
            minHeight: 56,
            borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.03)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.06)' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.09)' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(93,158,255,0.45)' },
          }}
        >
          {sprites.length === 0 ? (
            <MenuItem value="" disabled>No sprites imported yet</MenuItem>
          ) : (
            sprites.map((sprite) => (
              <MenuItem key={sprite.id} value={sprite.id} sx={{ minHeight: 52 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: 1,
                      overflow: 'hidden',
                      bgcolor: 'rgba(255,255,255,0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SpriteFrameCanvas frame={sprite.previewFrame} scale={1.75} />
                  </Box>
                  <Typography sx={{ fontSize: 14 }}>{sprite.name}</Typography>
                </Box>
              </MenuItem>
            ))
          )}
        </Select>
      </Box>
    </Box>
  )
}
