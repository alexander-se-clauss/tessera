import CloseIcon from '@mui/icons-material/Close'
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import type { ReactNode } from 'react'
import { editorTokens } from '../../../app/theme'

export const dialogPrimaryButtonSx: SxProps<Theme> = {
  fontWeight: 500,
  px: 2,
  height: editorTokens.control.height,
  borderRadius: `${editorTokens.control.radius}px`,
  bgcolor: 'rgba(93,158,255,0.16)',
  border: '1px solid rgba(93,158,255,0.22)',
  color: '#79b8ff',
  boxShadow: 'none',
  '&:hover': { bgcolor: 'rgba(93,158,255,0.22)', boxShadow: 'none' },
  '&.Mui-disabled': { opacity: 0.38 },
}

export const dialogSecondaryButtonSx: SxProps<Theme> = {
  height: editorTokens.control.height,
  px: 1.75,
  bgcolor: 'transparent',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: `${editorTokens.control.radius}px`,
  color: '#8b949e',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' },
}

export const dialogCancelButtonSx: SxProps<Theme> = {
  height: editorTokens.control.height,
  px: 1.75,
  color: '#6a737d',
  borderRadius: `${editorTokens.control.radius}px`,
  '&:hover': { color: '#8b949e', background: 'rgba(255,255,255,0.04)' },
}

type AppDialogProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  titleAdornment?: ReactNode
  actions?: ReactNode
  actionsJustify?: 'space-between' | 'flex-end' | 'flex-start'
  paperSx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
  fullWidth?: boolean
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  height?: string
  children: ReactNode
}

export function AppDialog({
  open,
  onClose,
  title,
  titleAdornment,
  actions,
  actionsJustify = 'space-between',
  paperSx,
  contentSx,
  fullWidth = true,
  maxWidth = 'xl',
  height,
  children,
}: AppDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth={fullWidth}
      maxWidth={maxWidth}
      slotProps={{
        paper: {
          sx: {
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            ...(height ? { height } : {}),
            ...paperSx,
          },
        },
      }}
    >
      <DialogTitle>
        {title}
        {titleAdornment}
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Close">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ color: '#6a737d', '&:hover': { color: '#e6edf3', background: 'rgba(255,255,255,0.04)' } }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', pt: '20px !important', ...contentSx }}>
        {children}
      </DialogContent>

      {actions != null && (
        <DialogActions sx={{ justifyContent: actionsJustify }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  )
}
