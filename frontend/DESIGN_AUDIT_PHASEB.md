# Phase B — Control-height / input-field conventions (report only, no changes applied)

Per instructions: b1 required no additional code (the shared button `sx`
exports already reference `editorTokens.control.*` as of the Phase A commit;
no global `MuiButton` default was added — see "Proposal, not applied" below).
b2 is a decision report only. **Nothing in this file has been applied to the
theme or to any dialog.**

Heights below are computed from MUI's own default input padding (read from
`node_modules/@mui/material/OutlinedInput/OutlinedInput.js` and
`InputBase/InputBase.js` in this repo) combined with this project's actual
`theme.ts` overrides (`MuiInputBase.styleOverrides.input.lineHeight: 1.45`,
`MuiSelect.styleOverrides.select.padding: '6px 10px'`). They are arithmetic,
not a screenshot measurement — treat them as "which bucket is bigger/smaller
and by roughly how much," and re-check visually before locking in a target if
sub-pixel precision matters.

## (a) Rendered height per convention, today

| Convention | Where the padding comes from | TextField height | Select height (same dialog) |
|---|---|---|---|
| **outlined, `size="small"`** | `OutlinedInput` small padding `8.5px 14px` + theme's `1.45` line-height (14px font) + 1px border × 2 | ≈ **39–40px** | ≈ **34px** — the theme's `MuiSelect.styleOverrides.select` forces `padding: '6px 10px'` on *every* Select regardless of `size`, so a "small" Select never inherits the small `OutlinedInput` padding; it's shorter than a small TextField by design of that override. |
| **outlined, default/medium (`margin="dense"` only)** | `OutlinedInput` medium padding `16.5px 14px` + line-height + border | ≈ **55–56px** | *(not used at medium anywhere in scope)* |
| **`variant="standard"`** | `InputBase` default padding `4px 0 5px` + line-height, no border box | ≈ **29–30px** | ≈ **32–33px** — same global `6px 10px` Select override applies here too, but because the standard TextField's own baseline is already short, the gap to Select is smaller (~3px) than in the "small" outlined case (~5–6px). |

**The root cause of the height mismatch is the theme itself**, not the
per-dialog choice of `size`/`variant`: `MuiSelect.styleOverrides.select`
(`theme.ts`) hardcodes `padding: '6px 10px'` unconditionally, so every Select
in the app renders at roughly the same ~32–34px regardless of what size or
variant the adjacent TextField uses. `CreateGroupDialog`'s manual
`dialogSelectSx` (`minHeight: 40` on `.MuiInputBase-root`) is a per-dialog
patch for exactly this theme-level gap.

## (b) Dialogs/fields affected by each convention

**outlined, `size="small"`:**
- `components/dialogs/ProjectPropertiesDialog.tsx` — Map `Select` (small),
  X/Y `TextField`s (small). Today: Select ≈34px next to TextFields ≈40px,
  **unpatched** — a visible ~6px gap currently live in this dialog.
- `components/dialogs/CreateGroupDialog.tsx` — Type `Select` only
  (`size="small"` + the `dialogSelectSx` patch forcing it to ≈40px). Note:
  this dialog's own Group-name `TextField` is *not* `size="small"` (see next
  row) — so even with the patch, the Select (≈40px, patched) and the
  Group-name TextField (≈56px, medium/unpatched) don't match each other
  either. The existing patch fixes Select-vs-"what Select would otherwise be,"
  not Select-vs-"this dialog's own TextField."

**outlined, default/medium + `margin="dense"`:**
- `components/dialogs/CreateGroupDialog.tsx` — Group-name `TextField`.
- `components/dialogs/CreateMapDialog.tsx` — Map-name `TextField`.
- `components/dialogs/CreateProjectDialog.tsx` — Project-name + Description
  `TextField`s.
- `components/dialogs/MapPropertiesDialog.tsx` — Map-name `TextField`.
- `assets/components/CreateTilesetDialog.tsx` — Name/Tile-width/Tile-height
  `TextField`s (no `size` or `variant` set at all — also medium/outlined,
  and separately already flagged in the original audit as the one dialog not
  routed through `AppDialog`).

**`variant="standard"`:**
- `assets/components/EditTilesetDialog.tsx` — Tileset-name `TextField`, Type
  `Select`, and (in `GroupDetails`/`DisabledGroupDetails`) Name/Cols/Rows/Type
  fields, all `variant="standard"`.
- Qualitatively (not exhaustively inventoried — these files are large and
  render inside the tileset-import/edit dialogs rather than being dialogs
  themselves): `assets/components/TilesetOrganizeCollisionStep.tsx` and
  `assets/components/ObjectsStep.tsx` predominantly use `variant="standard"`
  fields as well. Flag if you want a full per-field inventory of those two
  files before deciding.

## (c) Two options for a single target — tradeoffs, not a pick

**Option 1 — standardize on outlined `size="small"` (~40px).**
- Fix: raise the `MuiSelect` override's effective padding (or add an explicit
  height) so Select actually reaches ~40px instead of ~34px, matching a small
  `TextField` exactly.
- Once done, `CreateGroupDialog`'s manual `dialogSelectSx` patch becomes
  unnecessary and can be deleted.
- This is the more common/"standard MUI" convention (comfortable click
  target, familiar chrome) but is taller and heavier (visible outline box)
  than what `EditTilesetDialog` uses today.

**Option 2 — standardize on `variant="standard"` (~30px).**
- Fix: nudge the `MuiSelect` override's padding down slightly / give
  `.MuiSelect-select` an explicit height tied to the standard `InputBase`'s
  real content box, so Select's ~32–33px lines up with a standard
  TextField's ~29–30px (aligning Select *down* to TextField, the opposite
  direction from Option 1).
- This preserves the lighter, boxless look already used in the tileset
  editor and is the smaller delta from current code, but is a noticeably
  more compact / lower-touch-target control than what most of the "Create X"
  dialogs use today.

## (d) Full blast radius per option (controls whose rendered height or chrome would change)

**Under Option 1 (target ≈40px, outlined small):**
| Control | Today | Under Option 1 |
|---|---|---|
| `ProjectPropertiesDialog` Map Select | ≈34px | ≈40px (height +) |
| `ProjectPropertiesDialog` X/Y TextFields | ≈40px | unchanged |
| `CreateGroupDialog` Type Select | ≈40px (already patched) | unchanged in height; the manual patch sx can be deleted |
| `CreateGroupDialog` Group-name TextField | ≈56px (medium) | ≈40px (height −), loses no chrome (still outlined) |
| `CreateMapDialog` Map-name TextField | ≈56px | ≈40px (height −) |
| `CreateProjectDialog` Name/Description TextFields | ≈56px | ≈40px (height −) |
| `MapPropertiesDialog` Map-name TextField | ≈56px | ≈40px (height −) |
| `CreateTilesetDialog` Name/Width/Height TextFields | ≈56px | ≈40px (height −) |
| `EditTilesetDialog` all standard fields (name, type, cols, rows) | ≈29–33px, no outline | ≈40px (height +) **and** gains a visible outline box where today there's just an underline — a chrome change, not just sizing |
| `TilesetOrganizeCollisionStep` / `ObjectsStep` standard fields | ≈29–33px, no outline | same chrome change as above, unverified full extent |

**Under Option 2 (target ≈30px, standard variant):**
| Control | Today | Under Option 2 |
|---|---|---|
| `ProjectPropertiesDialog` Map Select | ≈34px | ≈30px (height −, small change) |
| `ProjectPropertiesDialog` X/Y TextFields | ≈40px, outlined | ≈30px (height −) **and** loses the outline box (chrome change) |
| `CreateGroupDialog` Type Select | ≈40px (patched) | ≈30px (height −); patch becomes obsolete/wrong and must be deleted, not just left alone |
| `CreateGroupDialog` Group-name TextField | ≈56px, outlined | ≈30px (height −, larger) **and** loses outline box |
| `CreateMapDialog` Map-name TextField | ≈56px | ≈30px (height −) + loses outline |
| `CreateProjectDialog` Name/Description TextFields | ≈56px | ≈30px (height −) + loses outline (Description is `multiline minRows={3}` — a standard-variant multiline field looks different enough from today that it's worth a specific look) |
| `MapPropertiesDialog` Map-name TextField | ≈56px | ≈30px (height −) + loses outline |
| `CreateTilesetDialog` Name/Width/Height TextFields | ≈56px | ≈30px (height −) + loses outline |
| `EditTilesetDialog` / `TilesetOrganizeCollisionStep` / `ObjectsStep` standard fields | ≈29–33px | unchanged (this is already the target) |

## Proposal, not applied: global `MuiButton` height/radius default

Per b1's constraint, no global `MuiButton` `defaultProps`/`styleOverrides`
height or radius was added — that would restyle every `Button` in the app
(toolbar buttons, tool-rail buttons, menu-bar buttons, etc.), which is well
outside the dialog/design-system scope of this pass. If a future pass wants
to pursue it, the concrete finding to build on is: `AppDialog`'s three footer
button `sx` objects and the two compact-control usages already agree on
`editorTokens.control.height` (34) / `heightCompact` (30) / `radius` (5) as of
the Phase A commit — a global default would just need to decide whether
*non-dialog* buttons (toolbar/rail/menu) should also converge on one of those
two heights, which is a separate, larger blast-radius question than anything
audited here.
