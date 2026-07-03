import { Box, Typography } from '@mui/material'
import { keyframes } from '@mui/system'
import { useEffect, useState } from 'react'
import { authTokens as auth } from '../../../app/theme'

const eventPulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.25; }
`

const eventLabels = [
  'NPC_DIALOG · (5,4)',
  'WARP_ZONE · (8,3)',
]

const tileColors: Record<number, string> = {
  0: '#091929',
  1: '#0d3050',
  2: '#0a2218',
  3: '#1c4d2a',
  4: '#0a2210',
  5: '#5c3e1a',
  6: '#323248',
  7: '#6e5628',
}

const mapRows = [
  [1, 1, 0, 1, 3, 3, 3, 3, 3, 4, 4, 3, 1, 1],
  [1, 0, 1, 3, 3, 3, 3, 4, 3, 4, 3, 3, 1, 1],
  [0, 1, 3, 3, 3, 5, 5, 3, 3, 3, 3, 3, 1, 0],
  [1, 3, 3, 3, 5, 5, 5, 3, 6, 6, 3, 3, 3, 1],
  [3, 3, 3, 5, 5, 7, 5, 3, 6, 6, 3, 3, 3, 3],
  [3, 3, 4, 3, 5, 5, 3, 3, 3, 3, 3, 3, 3, 3],
  [3, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 4, 3, 3],
  [3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 4, 4, 3, 2],
  [2, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2],
  [2, 2, 2, 2, 2, 2, 2, 3, 3, 2, 2, 2, 2, 1],
]

const paletteColors = [
  '#1c4d2a',
  auth.success,
  '#0a2210',
  '#5c3e1a',
  '#6e5628',
  '#323248',
  '#0d3050',
  '#1a5a9a',
  auth.accent,
  '#6d8ae8',
  auth.success,
  '#96c458',
]

export function TileMapPreview() {
  const [eventLabel, setEventLabel] = useState('NPC_DIALOG · (5,4)')

  useEffect(() => {
    let currentIndex = 0
    const intervalId = window.setInterval(() => {
      currentIndex = (currentIndex + 1) % eventLabels.length
      setEventLabel(eventLabels[currentIndex])
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <Box
      sx={{
        background: '#161b22',
        border: `1px solid ${auth.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '310px',
      }}
    >
      <Box
        sx={{
          padding: '7px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
          <Box
            key={color}
            sx={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}
          />
        ))}
        <Typography sx={{ fontSize: '9px', color: auth.text.muted, marginLeft: '4px' }}>
          overworld.map
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ background: auth.accent, color: '#fff', fontSize: '8px', padding: '2px 7px', borderRadius: '3px', fontWeight: 700 }}>
          BG
        </Box>
        <Box sx={{ color: auth.text.muted, fontSize: '8px', padding: '2px 6px', border: `1px solid ${auth.border}`, borderRadius: '3px' }}>
          FG
        </Box>
        <Box sx={{ color: '#e8a832', fontSize: '8px', padding: '2px 6px', border: '1px solid rgba(232,168,50,0.35)', borderRadius: '3px' }}>
          Events
        </Box>
      </Box>

      <Box
        sx={{
          padding: '5px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <Typography sx={{ fontSize: '8px', color: '#6a737d', marginRight: '4px' }}>
          fantasy_v2
        </Typography>
        <Box sx={{ display: 'flex', gap: '2px' }}>
          {paletteColors.map((color, index) => (
            <Box
              key={`${color}-${index}`}
              sx={{
                width: '13px',
                height: '13px',
                borderRadius: '2px',
                border: '1px solid rgba(255,255,255,0.07)',
                flexShrink: 0,
                background: color,
                outline: index === 3 ? `2px solid ${auth.accent}` : 'none',
                outlineOffset: index === 3 ? '-2px' : 0,
              }}
            />
          ))}
        </Box>
      </Box>

      <Box sx={{ padding: '7px 10px' }}>
        <Box
          sx={{
            display: 'inline-block',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          {mapRows.map((row, y) => (
            <Box key={y} sx={{ display: 'flex' }}>
              {row.map((tileType, x) => {
                const isSelected = x === 5 && y === 4
                const hasEvent = (x === 5 && y === 4) || (x === 8 && y === 3)
                return (
                  <Box
                    key={`${x}-${y}`}
                    sx={{
                      width: '17px',
                      height: '17px',
                      background: tileColors[tileType],
                      borderRight: '1px solid rgba(255,255,255,0.04)',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      position: 'relative',
                      flexShrink: 0,
                      outline: isSelected ? '2px solid rgba(56,139,253,0.85)' : 'none',
                      outlineOffset: isSelected ? '-2px' : 0,
                      zIndex: isSelected ? 2 : 0,
                    }}
                  >
                    {hasEvent ? (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '4px',
                            height: '4px',
                            borderRadius: '50%',
                            bgcolor: '#e8a832',
                            pointerEvents: 'none',
                            animation: `${eventPulse} 2.2s ease-in-out infinite`,
                          }}
                        />
                      ) : null}
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      </Box>

      <Box
        sx={{
          padding: '4px 10px 6px',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        <Typography sx={{ fontSize: '8px', color: '#6a737d' }}>cursor: (5, 4)</Typography>
        <Typography sx={{ fontSize: '8px', color: '#6a737d' }}>·</Typography>
        <Typography sx={{ fontSize: '8px', color: '#e8a832' }}>{eventLabel}</Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: '8px', color: '#6a737d' }}>14×10</Typography>
      </Box>
    </Box>
  )
}
