# TileCraft AI Design System
## v1 — AI-First Implementation Guide

This document defines the exact UI implementation rules for TileCraft.

Goal:
- consistent UI generation
- consistent refactoring
- prevent admin/dashboard UI regression
- maintain premium creative-tool appearance

Always follow these rules exactly.

---

# CORE DESIGN RULES

- Canvas/workspace is always the primary visual focus.
- Sidebars and inspectors must visually recede.
- Never use strong borders.
- Never use nested cards.
- Never use dashboard-style layouts.
- Never use CRUD-style stacked forms.
- Use spacing instead of separators.
- Use gradients, shadows, blur, and tonal contrast for depth.
- Floating controls must use blur and soft shadows.
- Avoid default Material UI appearance everywhere.

---

# DESIGN REFERENCES

Target visual direction:
- Figma
- Rive
- Aseprite
- Linear
- Godot editor
- modern macOS creative tools

Avoid:
- Jira
- Material UI dashboard examples
- admin panels
- analytics UIs
- enterprise CRUD tools

---

# LAYOUT SYSTEM

## Main Layout

Desktop editor layout:

- left sidebar
- center workspace
- right inspector

Use:
```css
grid-template-columns: 280px minmax(640px, 1fr) 340px;
gap: 56px;
```

Rules:
- panels must never touch
- center workspace must dominate visually
- side panels must feel secondary

---

# SPACING SYSTEM

Use only these spacing values:

```text
4
8
12
16
24
32
48
56
```

Rules:
- control spacing: 8–12
- section spacing: 32
- major panel spacing: 48–56
- avoid random spacing values

---

# RADIUS SYSTEM

Use only these radii:

```text
8   small controls
10  inputs/buttons
12  rows/chips
16  viewports
22  panels/dialogs
999 floating toolbars
```

Never use sharp corners.

---

# TYPOGRAPHY

## Font Stack

Always use:

```css
font-family:
  "Inter",
  "SF Pro Display",
  "Segoe UI",
  sans-serif;
```

Never use:
- monospace for UI
- condensed fonts
- serif fonts

---

## Typography Scale

### Window/Dialog Title

```css
font-size: 28px;
font-weight: 600;
letter-spacing: -0.02em;
line-height: 1.1;
```

### Section Labels

```css
font-size: 11px;
font-weight: 650;
letter-spacing: 0.10em;
text-transform: uppercase;
color: rgba(220,230,245,0.42);
```

### Body Text

```css
font-size: 14px;
font-weight: 400;
line-height: 1.5;
color: rgba(240,245,255,0.92);
```

### Metadata

```css
font-size: 12px;
color: rgba(220,230,245,0.45);
```

Never overuse bold text.

---

# COLOR SYSTEM

## Background Gradient

Always use atmospheric layered gradients.

Preferred:

```css
background:
  radial-gradient(circle at 50% 20%, rgba(67,96,140,0.16), transparent 34%),
  radial-gradient(circle at 80% 10%, rgba(60,120,220,0.08), transparent 28%),
  linear-gradient(180deg, #151b23 0%, #10161d 45%, #0c1117 100%);
```

Never use:
- flat gray backgrounds
- pure black backgrounds
- high contrast blocks

---

## Surface Colors

### Primary Surface

```css
background: rgba(18,24,32,0.72);
backdrop-filter: blur(14px);
```

### Secondary Surface

```css
background: rgba(255,255,255,0.035);
```

### Hover Surface

```css
background: rgba(255,255,255,0.055);
```

---

# TEXT COLORS

## Primary

```css
color: rgba(240,245,255,0.92);
```

## Secondary

```css
color: rgba(220,230,245,0.72);
```

## Muted

```css
color: rgba(220,230,245,0.42);
```

---

# ACCENT COLOR

Use one accent only.

Primary accent blue:

```css
#5d9eff
```

Blue means:
- selected
- active
- focused
- editable

Do not introduce competing accent colors.

---

# BORDER RULES

Borders are last resort.

Before adding a border ask:
"Can spacing/shadow solve this instead?"

Preferred border:

```css
border: 1px solid rgba(255,255,255,0.05);
```

Never use:
- thick borders
- bright outlines
- hard separators
- visible panel frames

Most panels should rely on:
- spacing
- shadows
- gradients
- blur

NOT borders.

---

# SHADOW SYSTEM

## Floating Panels

```css
box-shadow:
  0 20px 60px rgba(0,0,0,0.30);
```

## Floating Toolbar

```css
box-shadow:
  0 16px 45px rgba(0,0,0,0.42),
  inset 0 1px 0 rgba(255,255,255,0.05);
```

## Canvas Viewport

```css
box-shadow:
  0 24px 70px rgba(0,0,0,0.45);
```

Never use:
- small weak shadows
- hard drop shadows
- multiple stacked card shadows

---

# TOOLBAR RULES

Toolbars must float.

Never attach toolbars directly to edges.

Toolbar style:

```css
background:
  linear-gradient(
    180deg,
    rgba(34,42,54,0.82),
    rgba(22,28,38,0.72)
  );

backdrop-filter: blur(18px);

border:
  1px solid rgba(255,255,255,0.07);

border-radius: 999px;
padding: 8px 10px;
```

Toolbar buttons:
- size: 34px
- radius: 10px
- icon-first
- compact
- subtle hover states

Active button:

```css
background: rgba(93,158,255,0.22);
border: 1px solid rgba(93,158,255,0.35);
```

Never use:
- segmented toolbar borders
- visible separators
- boxed toolbar groups

---

# SIDEBAR RULES

Sidebar must visually recede.

Never:
- render sidebar as a strong card
- use strong outer border
- use bright background

Sidebar should feel integrated into workspace.

Preferred:
```css
background: transparent;
border: none;
```

---

## Sidebar Rows

Inactive:

```css
background: rgba(255,255,255,0.025);
border: 1px solid rgba(255,255,255,0.035);
```

Active:

```css
background:
  linear-gradient(
    90deg,
    rgba(93,158,255,0.20),
    rgba(93,158,255,0.08)
  );

border:
  1px solid rgba(93,158,255,0.28);
```

Never use:
- hard active outlines
- giant selected cards

---

# INSPECTOR RULES

Inspector should feel:
- compact
- assistive
- tool-like

Never:
- giant forms
- stacked settings cards
- card-in-card layouts

Inspector panel:

```css
background:
  linear-gradient(
    180deg,
    rgba(24,31,42,0.70),
    rgba(15,20,28,0.66)
  );

backdrop-filter: blur(14px);

border:
  1px solid rgba(255,255,255,0.04);

border-radius: 22px;

padding: 28px 26px;
```

Use spacing between sections instead of separators.

---

# CANVAS RULES

Canvas is the primary focus.

Never:
- trap canvas in thick frames
- over-border the workspace
- clutter around the viewport

Canvas viewport:

```css
background:
  radial-gradient(
    circle at center,
    rgba(255,255,255,0.04),
    transparent 60%
  ),
  rgba(4,8,12,0.45);

border-radius: 16px;

box-shadow:
  0 24px 70px rgba(0,0,0,0.45);
```

Sprite rendering:
```css
image-rendering: pixelated;
```

---

# INPUT RULES

Inputs must feel compact and tool-like.

Never:
- oversized mobile inputs
- default browser number steppers
- giant outlined Material fields

Input style:

```css
background: rgba(255,255,255,0.035);

border:
  1px solid rgba(255,255,255,0.07);

border-radius: 10px;

height: 36px;

font-size: 14px;
```

Hide native number steppers:

```css
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

input[type="number"] {
  -moz-appearance: textfield;
}
```

---

# ANIMATION EDITOR RULES

Animations are sequences.
Not lists of forms.

Never:
- stacked frame cards
- repeated duration labels
- repeated offset controls

Always use:
- horizontal frame timeline
- compact thumbnails
- shared selected-frame editing

---

## Timeline Structure

```text
[Play] [Frame] [Frame] [Frame] [+]
```

Rules:
- horizontal scroll only
- no wrapping
- compact layout
- timeline should scale to many frames

---

## Timeline Frames

```css
width: 48px;
height: 48px;

border-radius: 10px;

background:
  rgba(255,255,255,0.035);

border:
  1px solid rgba(255,255,255,0.06);
```

Selected frame:

```css
border:
  2px solid #5d9eff;

box-shadow:
  0 0 0 3px rgba(93,158,255,0.14),
  0 8px 20px rgba(0,0,0,0.28);

background:
  rgba(93,158,255,0.10);
```

---

# SCROLLBAR RULES

Scrollbars must be hidden or extremely subtle.

Preferred:

```css
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.12);
  border-radius: 999px;
}
```

Never use:
- thick default scrollbars
- bright scrollbar tracks

---

# MODAL RULES

Modal/dialog shell:

```css
border-radius: 24px;

border:
  1px solid rgba(255,255,255,0.06);

box-shadow:
  0 30px 100px rgba(0,0,0,0.55),
  inset 0 1px 0 rgba(255,255,255,0.04);
```

Never:
- strong header/footer separators
- visible outer blue outlines
- flat dialog backgrounds

---

# COMPONENT ANTI-PATTERNS

Never use:
- dashboard layouts
- CRUD forms
- nested cards
- giant inspector forms
- strong borders
- thick separators
- default MUI Paper appearance
- default MUI TextField appearance
- stacked animation cards
- visible panel outlines
- dense enterprise spacing
- equal visual weight for all panels

---

# FINAL GOAL

The UI must feel like:
- a premium indie game creation suite
- a focused creative workspace
- a modern desktop editor
- calm and atmospheric
- spatial and immersive
- minimal but powerful

The user should feel:
"I am inside a professional creative tool."

NOT:
"I am configuring data in an admin dashboard."
