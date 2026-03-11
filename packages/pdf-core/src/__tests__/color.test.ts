import { describe, it, expect } from 'vitest';
import { rgba, rgbaToCss, hexToRgba, rgbaToHex } from '../utils/color';

describe('Color Utilities', () => {
  it('creates RGBA color', () => {
    const c = rgba(255, 128, 0, 0.5);
    expect(c).toEqual({ r: 255, g: 128, b: 0, a: 0.5 });
  });

  it('defaults alpha to 1', () => {
    const c = rgba(255, 0, 0);
    expect(c.a).toBe(1);
  });

  it('converts RGBA to CSS', () => {
    expect(rgbaToCss(rgba(255, 0, 0, 0.5))).toBe('rgba(255, 0, 0, 0.5)');
    expect(rgbaToCss(rgba(0, 128, 255, 1))).toBe('rgba(0, 128, 255, 1)');
  });

  it('converts hex to RGBA', () => {
    expect(hexToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgba('00ff00', 0.5)).toEqual({ r: 0, g: 255, b: 0, a: 0.5 });
  });

  it('converts RGBA to hex', () => {
    expect(rgbaToHex(rgba(255, 0, 0))).toBe('#ff0000');
    expect(rgbaToHex(rgba(0, 128, 255))).toBe('#0080ff');
  });
});
