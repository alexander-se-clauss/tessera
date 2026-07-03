import { editorTokens as tok } from '../../../app/theme'
import { Box, ButtonBase, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'

const TOOLBAR_HEIGHT = 56
const TOOLBAR_PADDING_Y = 8
const TOOLBAR_PADDING_X = 10
const TOOLBAR_GAP = 7
const ICON_BUTTON_SIZE = 40
const ICON_BUTTON_RADIUS = 8
const SEGMENT_HEIGHT = 40
const SEGMENT_RADIUS = 8
const SEPARATOR_HEIGHT = 22
const TOOLBAR_RADIUS = 0

type ToolbarButtonState = 'default' | 'active' | 'primary' | 'disabled'

type EditorToolbarProps = {
  children: ReactNode
  sx?: SxProps<Theme>
}

type EditorToolbarButtonProps = {
  icon: ReactNode
  label: string
  active?: boolean
  primary?: boolean
  disabled?: boolean
  onClick?: () => void
}

type EditorToolbarSegmentProps = {
  children: ReactNode
  width?: number | string
  sx?: SxProps<Theme>
}

function stateStyles(state: ToolbarButtonState) {
  if (state === 'active') {
    return {
      background: 'rgba(77,156,255,0.14)',
      border: '1px solid rgba(77,156,255,0.45)',
      color: '#4d9cff',
      boxShadow: 'none',
    }
  }

  if (state === 'primary') {
    return {
      background: 'rgba(73,220,145,0.13)',
      border: '1px solid rgba(73,220,145,0.46)',
      color: 'rgba(160,255,200,0.95)',
      boxShadow: 'none',
    }
  }

  if (state === 'disabled') {
    return {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.035)',
      color: 'rgba(220,230,245,0.24)',
      boxShadow: 'none',
      filter: 'grayscale(0.4)',
      cursor: 'not-allowed',
    }
  }

  return {
    background: 'transparent',
    border: '1px solid transparent',
    color: '#8f9baa',
    boxShadow: 'none',
  }
}

function hoverStyles(state: ToolbarButtonState) {
  if (state === 'disabled') {
    return {}
  }

  if (state === 'active') {
    return {
      background: 'rgba(77,156,255,0.18)',
      border: '1px solid rgba(77,156,255,0.55)',
      color: '#4d9cff',
    }
  }

  if (state === 'primary') {
    return {
      background: 'rgba(73,220,145,0.18)',
      border: '1px solid rgba(84,230,157,0.54)',
      color: 'rgba(214,255,229,0.98)',
    }
  }

  return {
    background: tok.border.colorDefault,
    border: '1px solid transparent',
    color: '#d6dee8',
  }
}

export function EditorToolbar({ children, sx }: EditorToolbarProps) {
  return (
    <Box
      sx={[
        {
          minHeight: `${TOOLBAR_HEIGHT}px`,
          px: `${TOOLBAR_PADDING_X}px`,
          py: `${TOOLBAR_PADDING_Y}px`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${TOOLBAR_GAP}px`,
          borderRadius: `${TOOLBAR_RADIUS}px`,
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}

export function EditorToolbarButton({
  icon,
  label,
  active = false,
  primary = false,
  disabled = false,
  onClick,
}: EditorToolbarButtonProps) {
  const state: ToolbarButtonState = disabled ? 'disabled' : primary ? 'primary' : active ? 'active' : 'default'

  return (
    <ButtonBase
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
      sx={{
        width: `${ICON_BUTTON_SIZE}px`,
        minWidth: `${ICON_BUTTON_SIZE}px`,
        maxWidth: `${ICON_BUTTON_SIZE}px`,
        height: `${ICON_BUTTON_SIZE}px`,
        minHeight: `${ICON_BUTTON_SIZE}px`,
        maxHeight: `${ICON_BUTTON_SIZE}px`,
        p: 0,
        borderRadius: `${ICON_BUTTON_RADIUS}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease',
        ...stateStyles(state),
        '&:hover': hoverStyles(state),
        '& .MuiSvgIcon-root': {
          fontSize: 19,
        },
      }}
    >
      {icon}
    </ButtonBase>
  )
}

export function EditorToolbarSegment({ children, width, sx }: EditorToolbarSegmentProps) {
  return (
    <Box
      sx={[
        {
          width: width ?? 'auto',
          minHeight: `${SEGMENT_HEIGHT}px`,
          height: `${SEGMENT_HEIGHT}px`,
          px: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: `${SEGMENT_RADIUS}px`,
          background: '#111923',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#d6dee8',
          boxShadow: 'none',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  )
}

export function EditorToolbarSeparator() {
  return (
    <Box
      sx={{
        width: 1,
        height: `${SEPARATOR_HEIGHT}px`,
        mx: '8px',
      }}
    />
  )
}

export function EditorToolbarLabel({
  text,
  width = 72,
}: {
  text: string
  width?: number
}) {
  return (
    <EditorToolbarSegment
      width={width}
      sx={{
        justifyContent: 'center',
        px: 1.5,
      }}
    >
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#8f9baa', lineHeight: 1 }}>
        {text}
      </Typography>
    </EditorToolbarSegment>
  )
}