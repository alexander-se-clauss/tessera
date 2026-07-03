import React, { useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Box, Popover, Typography, Button, Divider, TextField } from '@mui/material';
import NorthIcon from '@mui/icons-material/North';
import SouthIcon from '@mui/icons-material/South';
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { SpriteState, SpriteStateTag } from '../types/sprite';

const DIRECTIONAL = ['walk', 'run', 'push', 'carry', 'attack', 'climb', 'swim', 'hurt'];
const NON_DIRECTIONAL = ['idle', 'jump', 'fall', 'die', 'sit', 'sleep'];
const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type Direction = typeof DIRECTIONS[number];

const DIR_ICONS: Record<Direction, React.ReactNode> = {
  up:    <NorthIcon sx={{ fontSize: 13 }} />,
  down:  <SouthIcon sx={{ fontSize: 13 }} />,
  left:  <WestIcon  sx={{ fontSize: 13 }} />,
  right: <EastIcon  sx={{ fontSize: 13 }} />,
};

interface Props {
  anchorEl: HTMLElement | null;
  existingNames: string[];
  onAdd: (states: SpriteState[]) => void;
  onClose: () => void;
}

function makeState(name: string, tag: string): SpriteState {
  return { id: crypto.randomUUID(), name, tag: tag as SpriteStateTag, frames: [] };
}

export default function PresetPicker({ anchorEl, existingNames, onAdd, onClose }: Props) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [selectedDirs, setSelectedDirs]     = useState<Direction[]>([]);
  const [customName, setCustomName]         = useState('');
  const [directionAnchorEl, setDirectionAnchorEl] = useState<HTMLElement | null>(null);

  const open = Boolean(anchorEl);

  function handleClose() {
    setSelectedPreset(null);
    setSelectedDirs([]);
    setCustomName('');
    setDirectionAnchorEl(null);
    onClose();
  }

  function selectPreset(preset: string, event?: ReactMouseEvent<HTMLElement>) {
    // clicking the same preset deselects it
    if (selectedPreset === preset) {
      setSelectedPreset(null);
      setSelectedDirs([]);
      setDirectionAnchorEl(null);
    } else {
      setSelectedPreset(preset);
      setSelectedDirs([]);
      if (DIRECTIONAL.includes(preset) && event) {
        setDirectionAnchorEl(event.currentTarget);
      } else {
        setDirectionAnchorEl(null);
      }
    }
  }

  function toggleDir(dir: Direction) {
    setSelectedDirs(prev =>
      prev.includes(dir) ? prev.filter(d => d !== dir) : [...prev, dir]
    );
  }

  function selectAllDirs() {
    setSelectedDirs([...DIRECTIONS]);
  }

  // What will actually be created
  const toCreate: SpriteState[] = (() => {
    if (selectedPreset && DIRECTIONAL.includes(selectedPreset)) {
      // directional: one state per selected direction
      return selectedDirs
        .map(dir => `${selectedPreset}_${dir}`)
        .filter(name => !existingNames.includes(name))
        .map(name => makeState(name, selectedPreset));
    }
    if (selectedPreset && NON_DIRECTIONAL.includes(selectedPreset)) {
      // non-directional: single state
      if (existingNames.includes(selectedPreset)) return [];
      return [makeState(selectedPreset, selectedPreset)];
    }
    return [];
  })();

  function handleAdd() {
    if (toCreate.length === 0) return;
    onAdd(toCreate);
    handleClose();
  }

  function handleAddCustom() {
    const name = customName.trim();
    if (!name) return;
    if (existingNames.includes(name)) return;
    onAdd([makeState(name, 'custom')]);
    handleClose();
  }

  const isDirectional = selectedPreset !== null && DIRECTIONAL.includes(selectedPreset);

  const paperSx = {
    background: '#161b22',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    p: 1.5,
    width: 260,
  };

  const presetItemSx = (active: boolean, disabled: boolean) => ({
    px: 1.25, py: 0.75,
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    border: `1px solid ${active ? 'rgba(56,139,253,0.4)' : 'rgba(255,255,255,0.07)'}`,
    background: active ? 'rgba(56,139,253,0.15)' : 'transparent',
    color: disabled ? '#3a3f4a' : active ? '#79b8ff' : '#8b949e',
    mb: 0.5,
    '&:hover': disabled ? {} : {
      background: active ? 'rgba(56,139,253,0.22)' : 'rgba(255,255,255,0.06)',
      color: active ? '#79b8ff' : '#e6edf3',
      borderColor: active ? 'rgba(56,139,253,0.5)' : 'rgba(255,255,255,0.15)',
    },
  });

  return (
    <>
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{ paper: { sx: paperSx } }}
    >
      {/* Directional section */}
      <Typography sx={{ fontSize: 10, color: '#6a737d', mb: 0.75 }}>Directional</Typography>
      {DIRECTIONAL.map(preset => {
        const allTaken = DIRECTIONS.every(d => existingNames.includes(`${preset}_${d}`));
        const isActive = selectedPreset === preset;
        return (
          <Box key={preset} sx={presetItemSx(isActive, allTaken)} onClick={(event) => !allTaken && selectPreset(preset, event)}>
            {preset}
            <ChevronRightIcon sx={{ fontSize: 13, opacity: 0.5 }} />
          </Box>
        );
      })}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 1 }} />

      {/* Non-directional */}
      <Typography sx={{ fontSize: 10, color: '#6a737d', mb: 0.75 }}>Non-directional</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mb: 1 }}>
        {NON_DIRECTIONAL.map(preset => {
          const taken = existingNames.includes(preset);
          const isActive = selectedPreset === preset;
          return (
            <Box key={preset} sx={presetItemSx(isActive, taken)} onClick={() => !taken && selectPreset(preset)}>
              {preset}
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.07)', my: 1 }} />

      {/* Custom */}
      <Typography sx={{ fontSize: 10, color: '#6a737d', mb: 0.75 }}>Custom</Typography>
      <TextField
        fullWidth size="small"
        placeholder="State name"
        value={customName}
        onChange={e => { setCustomName(e.target.value); setSelectedPreset(null); setSelectedDirs([]); }}
        onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
        sx={{ mb: 1 }}
        slotProps={{ htmlInput: { style: { fontSize: 12, fontFamily: 'inherit' } } }}
      />

      {/* Will create preview */}
      {(toCreate.length > 0 || (customName.trim() && !existingNames.includes(customName.trim()))) && (
        <Box sx={{
          mb: 1, px: 1, py: 0.75,
          background: 'rgba(56,139,253,0.07)',
          border: '1px solid rgba(56,139,253,0.18)',
          borderRadius: '6px',
        }}>
          <Typography sx={{ fontSize: 10, color: '#6a737d', mb: 0.5 }}>Will create:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {toCreate.map(s => (
              <Box key={s.name} sx={{
                px: 0.75, py: 0.25, borderRadius: '4px', fontSize: 11,
                background: 'rgba(56,139,253,0.12)', color: '#79b8ff',
                border: '1px solid rgba(56,139,253,0.25)',
              }}>
                {s.name}
              </Box>
            ))}
            {customName.trim() && !existingNames.includes(customName.trim()) && (
              <Box sx={{
                px: 0.75, py: 0.25, borderRadius: '4px', fontSize: 11,
                background: 'rgba(56,139,253,0.12)', color: '#79b8ff',
                border: '1px solid rgba(56,139,253,0.25)',
              }}>
                {customName.trim()}
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Add button */}
      {customName.trim() ? (
        <Button fullWidth variant="contained" onClick={handleAddCustom}
          disabled={!customName.trim() || existingNames.includes(customName.trim())}
          sx={{ fontSize: 11, textTransform: 'none', fontFamily: 'inherit', py: 0.75 }}>
          Add
        </Button>
      ) : (
        <Button fullWidth variant="contained" onClick={handleAdd}
          disabled={toCreate.length === 0}
          sx={{ fontSize: 11, textTransform: 'none', fontFamily: 'inherit', py: 0.75 }}>
          {toCreate.length > 0 ? `Add ${toCreate.length} state${toCreate.length > 1 ? 's' : ''}` : 'Add'}
        </Button>
      )}
    </Popover>
    <Popover
      open={Boolean(directionAnchorEl) && isDirectional}
      anchorEl={directionAnchorEl}
      onClose={() => setDirectionAnchorEl(null)}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          sx: {
            background: '#161b22',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            p: 1,
            width: 180,
          },
        },
      }}
    >
      <Typography sx={{ fontSize: 10, color: '#6a737d', mb: 0.75 }}>
        {selectedPreset} — directions
      </Typography>
      {DIRECTIONS.map(dir => {
        const name = `${selectedPreset}_${dir}`;
        const taken = existingNames.includes(name);
        const active = selectedDirs.includes(dir);
        return (
          <Box
            key={dir}
            onClick={() => !taken && toggleDir(dir)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 1, py: 0.625,
              borderRadius: '5px',
              cursor: taken ? 'not-allowed' : 'pointer',
              opacity: taken ? 0.3 : 1,
              background: active ? 'rgba(56,139,253,0.12)' : 'transparent',
              mb: 0.25,
              '&:hover': taken ? {} : { background: 'rgba(255,255,255,0.05)' },
            }}
          >
            <Box sx={{ color: active ? '#388bfd' : '#6a737d', display: 'flex' }}>
              {DIR_ICONS[dir]}
            </Box>
            <Typography sx={{ fontSize: 12, flex: 1, color: active ? '#e6edf3' : '#8b949e', textTransform: 'capitalize' }}>
              {dir}
            </Typography>
            {active && <CheckIcon sx={{ fontSize: 11, color: '#388bfd' }} />}
            {taken && <Typography sx={{ fontSize: 10, color: '#6a737d' }}>exists</Typography>}
          </Box>
        );
      })}
      <Box
        onClick={selectAllDirs}
        sx={{
          mt: 0.5, pt: 0.75, pb: 0.25,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontSize: 11, color: '#6a737d',
          cursor: 'pointer', textAlign: 'center', borderRadius: '4px',
          '&:hover': { color: '#e6edf3', background: 'rgba(255,255,255,0.04)' },
        }}
      >
        Select all four
      </Box>
      {selectedDirs.length > 0 && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleAdd}
          sx={{ mt: 1, fontSize: 11, textTransform: 'none', fontFamily: 'inherit', py: 0.75 }}
        >
          {`Add ${toCreate.length} state${toCreate.length > 1 ? 's' : ''}`}
        </Button>
      )}
    </Popover>
    </>
  );
}
