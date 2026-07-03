import { Box, Slider, Typography } from '@mui/material'

type MovementSpeedControlProps = {
  value: number
  onChange: (value: number) => void
  speedLabel: string
}

export function MovementSpeedControl({ value, onChange, speedLabel }: MovementSpeedControlProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(220,230,245,0.42)' }}>
        Movement
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(220,230,245,0.72)' }}>
          Move speed (tiles / s)
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'rgba(240,245,255,0.92)' }}>
          {value.toFixed(1)} tiles/s
        </Typography>
      </Box>
      <Slider
        min={0.1}
        max={20}
        step={0.1}
        value={value}
        onChange={(_event, nextValue) => onChange(Number(nextValue))}
        sx={{
          color: '#5d9eff',
          py: 0.5,
          '& .MuiSlider-rail': {
            opacity: 1,
            bgcolor: 'rgba(220,230,245,0.18)',
          },
          '& .MuiSlider-track': {
            border: 'none',
            background: 'linear-gradient(90deg, #5d9eff 0%, #7ab8ff 100%)',
          },
          '& .MuiSlider-thumb': {
            width: 18,
            height: 18,
            bgcolor: '#eef4ff',
            boxShadow: '0 0 0 6px rgba(93,158,255,0.18)',
            '&::before': { boxShadow: 'none' },
          },
        }}
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.42)' }}>Slow</Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.58)', textAlign: 'center' }}>{speedLabel}</Typography>
        <Typography sx={{ fontSize: 12, color: 'rgba(220,230,245,0.42)', textAlign: 'right' }}>Fast</Typography>
      </Box>
    </Box>
  )
}
