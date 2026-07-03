import { Box, TextField, Typography } from '@mui/material'

type CollisionBoxControlsProps = {
  width: string
  height: string
  offsetX: string
  offsetY: string
  onWidthChange: (value: string) => void
  onHeightChange: (value: string) => void
  onOffsetXChange: (value: string) => void
  onOffsetYChange: (value: string) => void
}

const numberFieldSx = {
  '& .MuiOutlinedInput-root': {
    minHeight: 52,
    borderRadius: 1.5,
    bgcolor: 'rgba(255,255,255,0.035)',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
    '&.Mui-focused fieldset': { borderColor: 'rgba(93,158,255,0.4)' },
  },
  '& input[type=number]': {
    MozAppearance: 'textfield',
  },
  '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
    WebkitAppearance: 'none',
    margin: 0,
  },
}

function LabeledNumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(220,230,245,0.72)' }}>
        {label}
      </Typography>
      <TextField
        size="small"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        sx={numberFieldSx}
      />
    </Box>
  )
}

export function CollisionBoxControls(props: CollisionBoxControlsProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(220,230,245,0.42)' }}>
        Collision Box
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <LabeledNumberField label="Width (px)" value={props.width} onChange={props.onWidthChange} />
        <LabeledNumberField label="Height (px)" value={props.height} onChange={props.onHeightChange} />
        <LabeledNumberField label="Offset X (px)" value={props.offsetX} onChange={props.onOffsetXChange} />
        <LabeledNumberField label="Offset Y (px)" value={props.offsetY} onChange={props.onOffsetYChange} />
      </Box>
    </Box>
  )
}
