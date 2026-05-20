// Conversion helpers for Zebra label dimensions at 203 DPI (8 dots/mm).
export const DPI = 203;
export const DOTS_PER_MM = 8; // 203 DPI ≈ 8 dots/mm
export type Unit = 'px' | 'mm' | 'cm';

export const toPx = (value: number, unit: Unit): number => {
  if (unit === 'px') return Math.round(value);
  if (unit === 'mm') return Math.round(value * DOTS_PER_MM);
  if (unit === 'cm') return Math.round(value * DOTS_PER_MM * 10);
  return Math.round(value);
};

export const fromPx = (px: number, unit: Unit): number => {
  if (unit === 'px') return px;
  if (unit === 'mm') return +(px / DOTS_PER_MM).toFixed(2);
  if (unit === 'cm') return +(px / DOTS_PER_MM / 10).toFixed(2);
  return px;
};
