import { CssBaseline, ThemeProvider } from '@mui/material'
import { AppRouter } from './app/router'
import { editorTheme } from './app/theme'

function App() {
  return (
    <ThemeProvider theme={editorTheme}>
      <CssBaseline />
      <AppRouter />
    </ThemeProvider>
  )
}

export default App
