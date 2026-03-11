// ─── Color Utilities ───

import type { RgbaColor } from '../types/document';

/** Create an RGBA color. */
export function rgba(r: number, g: number, b: number, a = 1): RgbaColor {
  return { r, g, b, a };
}

/** Convert RGBA to CSS string. */
export function rgbaToCss(color: RgbaColor): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

/** Convert hex string to RGBA. */
export function hexToRgba(hex: string, alpha = 1): RgbaColor {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b, a: alpha };
}

/** Convert RGBA to hex string (ignores alpha). */
export function rgbaToHex(color: RgbaColor): string {
  const r = color.r.toString(16).padStart(2, '0');
  const g = color.g.toString(16).padStart(2, '0');
  const b = color.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

/** Default annotation colors. */
export const COLORS = {
  yellow: rgba(255, 235, 59, 0.4),
  red: rgba(244, 67, 54, 0.4),
  green: rgba(76, 175, 80, 0.4),
  blue: rgba(33, 150, 243, 0.4),
  orange: rgba(255, 152, 0, 0.4),
  purple: rgba(156, 39, 176, 0.4),
  black: rgba(0, 0, 0, 1),
  white: rgba(255, 255, 255, 1),
} as const;
