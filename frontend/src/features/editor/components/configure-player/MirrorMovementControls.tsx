import { Box, FormControlLabel, Switch, Typography } from '@mui/material'

type MirrorMovementControlsProps = {
  leftToRight: boolean
  rightToLeft: boolean
  onLeftToRightChange: (value: boolean) => void
  onRightToLeftChange: (value: boolean) => void
}

export function MirrorMovementControls(props: MirrorMovementControlsProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(220,230,245,0.42)' }}>
          Mirrored Sprites
        </Typography>
        <Typography sx={{ mt: 0.5, fontSize: 12, lineHeight: 1.45, color: 'rgba(220,230,245,0.5)' }}>
          Use an opposite-facing left/right sprite when the requested direction is missing.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <FormControlLabel
          control={
            <Switch
              checked={props.leftToRight}
              onChange={(event) => props.onLeftToRightChange(event.target.checked)}
              size="small"
            />
          }
          label="Mirror left sprites for right movement"
          sx={{
            m: 0,
            justifyContent: 'space-between',
            gap: 2,
            '& .MuiFormControlLabel-label': {
              fontSize: 13,
              color: 'rgba(220,230,245,0.72)',
            },
          }}
          labelPlacement="start"
        />
        <FormControlLabel
          control={
            <Switch
              checked={props.rightToLeft}
              onChange={(event) => props.onRightToLeftChange(event.target.checked)}
              size="small"
            />
          }
          label="Mirror right sprites for left movement"
          sx={{
            m: 0,
            justifyContent: 'space-between',
            gap: 2,
            '& .MuiFormControlLabel-label': {
              fontSize: 13,
              color: 'rgba(220,230,245,0.72)',
            },
          }}
          labelPlacement="start"
        />
      </Box>
    </Box>
  )
}
