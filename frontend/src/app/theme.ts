import { createTheme } from '@mui/material/styles'

export const fontStack = '"Inter", "SF Pro Display", "Segoe UI", sans-serif'

export const editorTokens = {
  background: {
    app: `
      radial-gradient(circle at 50% 20%, rgba(92,126,176,0.18), transparent 36%),
      radial-gradient(circle at 80% 10%, rgba(86,144,234,0.1), transparent 30%),
      linear-gradient(180deg, #222c38 0%, #1d2834 45%, #18222d 100%)
    `,
    dialog: `
      radial-gradient(circle at 28% 0%, rgba(93,158,255,0.14), transparent 28%),
      linear-gradient(180deg, #151b23 0%, #10161d 46%, #0c1117 100%)
    `,
    panel: 'linear-gradient(180deg, rgba(24,31,42,0.62), rgba(15,20,28,0.52))',
    menu: 'linear-gradient(180deg, rgba(24,31,42,0.96), rgba(15,20,28,0.94))',
    hover: 'rgba(255,255,255,0.055)',
    soft: 'rgba(255,255,255,0.035)',
    dim: 'rgba(255,255,255,0.025)',
    active: 'rgba(255,255,255,0.08)',
  },
  border: {
    subtle: '1px solid rgba(255,255,255,0.04)',
    default: '1px solid rgba(255,255,255,0.06)',
    strong: '1px solid rgba(255,255,255,0.09)',
    // Raw color values for use in `borderColor`, `outlineColor`, etc.
    colorSubtle: 'rgba(255,255,255,0.04)',
    colorDefault: 'rgba(255,255,255,0.06)',
    colorMid: 'rgba(255,255,255,0.07)',
    colorStrong: 'rgba(255,255,255,0.09)',
  },
  // Flat solid surface colors used for panels, canvas, toolbars, etc.
  surface: {
    panel: '#111922',    // sidebars, inspector, tree panel
    canvas: '#121a23',   // center editor canvas area
    deep: '#0e141b',     // viewport / below-canvas layer
    body: '#0f151d',     // main editor body wrapper
    toolbar: '#121b26',  // top bar, toolbar strip, menu bar
  },
  // Named text colors used across editor components
  text: {
    primary: '#d6dee8',
    muted: '#8f9baa',
    faint: '#667383',
    accent: '#4d9cff',
  },
  radius: {
    control: 10,
    row: 12,
    viewport: 16,
    panel: 22,
    floating: 999,
  },
  shadow: {
    panel: '0 20px 60px rgba(0,0,0,0.26)',
    menu: '0 18px 48px rgba(0,0,0,0.38)',
    primaryButton: '0 8px 22px rgba(73,145,238,0.25)',
  },
} as const

// Palette for auth pages and the public landing page
export const authTokens = {
  bg: '#0d1117',
  surface: '#21262d',
  border: 'rgba(255,255,255,0.14)',
  text: {
    primary: '#f0f6fc',
    muted: '#8b949e',
    faint: '#6e7681',
  },
  accent: '#388bfd',
  success: '#3d8a4e',
} as const

export const editorTheme = createTheme({
  typography: {
    fontFamily: fontStack,
    fontSize: 14,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 600,
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.15,
      letterSpacing: '-0.03em',
    },
    h5: {
      fontSize: '1.375rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.35,
    },
    subtitle1: {
      fontSize: '0.9375rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    subtitle2: {
      fontSize: '0.8125rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0',
      textTransform: 'none',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 10,
  },
  palette: {
    mode: 'dark',
    background: {
      default: '#0b1016',
      paper: '#131a23',
    },
    divider: 'rgba(166, 182, 202, 0.14)',
    primary: {
      main: '#5da5ff',
      light: '#1f3652',
      dark: '#d6e7ff',
    },
    warning: { main: '#ffb347', light: '#5d4218' },
    success: { main: '#88c759', light: '#26361a' },
    error: { main: '#ff6e6a' },
    text: {
      primary: '#eef4ff',
      secondary: '#b0bccb',
      disabled: '#718095',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: fontStack,
          fontSize: '14px',
          lineHeight: 1.5,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '0.5px solid rgba(166,182,202,0.14)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(166,182,202,0.14)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          fontSize: '0.875rem',
          padding: '6px 10px',
          fontFamily: 'inherit',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          padding: '7px 14px',
          textTransform: 'none',
          fontFamily: 'inherit',
          border: '0.5px solid transparent',
          color: '#b0bccb',
          '&.Mui-selected': {
            backgroundColor: '#1b2633',
            borderColor: 'rgba(166,182,202,0.18)',
            fontWeight: 600,
            color: '#eef4ff',
          },
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          fontWeight: 600,
          fontFamily: fontStack,
          textTransform: 'none',
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: fontStack,
          fontSize: '0.875rem',
          fontWeight: 500,
        },
        input: {
          fontFamily: fontStack,
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.45,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0f151d',
          color: '#e6edf3',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
          backgroundImage: 'none',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          minHeight: 48,
          color: '#c9d1d9',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
          '&.MuiDialogContent-dividers': {
            borderColor: 'rgba(255,255,255,0.06)',
            padding: '16px 24px',
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '10px 24px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          '& .MuiButton-root': {
            textTransform: 'none',
            lineHeight: 1.2,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: 11,
          fontWeight: 500,
          color: 'rgba(220,230,245,0.52)',
          letterSpacing: '0.04em',
          '&.Mui-focused': {
            color: 'rgba(220,230,245,0.58)',
          },
        },
      },
    },
    MuiInput: {
      styleOverrides: {
        underline: {
          '&:before': {
            borderBottomColor: 'rgba(255,255,255,0.12)',
          },
          '&:hover:not(.Mui-disabled):before': {
            borderBottomColor: 'rgba(255,255,255,0.22)',
          },
          '&:after': {
            borderBottomColor: 'rgba(93,158,255,0.6)',
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          lineHeight: 1.45,
          color: '#718095',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          fontWeight: 500,
          lineHeight: 1.35,
          fontFamily: fontStack,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
})

export const appTheme = editorTheme
