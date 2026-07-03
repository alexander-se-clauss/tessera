export const rectangleCanvasPatternSx = {
  backgroundColor: '#080c12',
  backgroundImage: `
    linear-gradient(45deg, #0d1118 25%, transparent 25%),
    linear-gradient(-45deg, #0d1118 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #0d1118 75%),
    linear-gradient(-45deg, transparent 75%, #0d1118 75%)
  `,
  backgroundSize: '12px 12px',
  backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
} as const
