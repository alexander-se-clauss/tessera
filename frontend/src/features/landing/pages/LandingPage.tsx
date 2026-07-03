import { Box } from '@mui/material'
import { authTokens as auth } from '../../../app/theme'
import { LandingFeatures } from '../components/LandingFeatures'
import { LandingHero } from '../components/LandingHero'
import { LandingNav } from '../components/LandingNav'

export function LandingPage() {
  return (
    <Box
      sx={{
        bgcolor: auth.bg,
        color: '#e6edf3',
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Mono', monospace",
        fontSize: '12px',
        minHeight: '100vh',
      }}
    >
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
    </Box>
  )
}
