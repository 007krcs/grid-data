import { describe, it, expect } from 'vitest';
import {
  rectsIntersect,
  rectContains,
  pointInRect,
  rectUnion,
  rectWidth,
  rectHeight,
  rectCenter,
  rectTranslate,
  rectNormalize,
} from '../utils/geometry';
import type { PdfRect } from '../types/document';

describe('Geometry Utilities', () => {
  const rectA: PdfRect = [0, 0, 10, 10];
  const rectB: PdfRect = [5, 5, 15, 15];
  const rectC: PdfRect = [20, 20, 30, 30];
  const rectD: PdfRect = [2, 2, 8, 8]; // inside rectA

  it('detects intersecting rectangles', () => {
    expect(rectsIntersect(rectA, rectB)).toBe(true);
    expect(rectsIntersect(rectA, rectC)).toBe(false);
    expect(rectsIntersect(rectA, rectD)).toBe(true);
  });

  it('detects containment', () => {
    expect(rectContains(rectA, rectD)).toBe(true);
    expect(rectContains(rectD, rectA)).toBe(false);
    expect(rectContains(rectA, rectB)).toBe(false);
  });

  it('checks point in rect', () => {
    expect(pointInRect(5, 5, rectA)).toBe(true);
    expect(pointInRect(0, 0, rectA)).toBe(true);
    expect(pointInRect(11, 5, rectA)).toBe(false);
  });

  it('computes rect union', () => {
    expect(rectUnion(rectA, rectB)).toEqual([0, 0, 15, 15]);
    expect(rectUnion(rectA, rectC)).toEqual([0, 0, 30, 30]);
  });

  it('computes width and height', () => {
    expect(rectWidth(rectA)).toBe(10);
    expect(rectHeight(rectA)).toBe(10);
    expect(rectWidth(rectB)).toBe(10);
  });

  it('computes center', () => {
    expect(rectCenter(rectA)).toEqual({ x: 5, y: 5 });
    expect(rectCenter(rectB)).toEqual({ x: 10, y: 10 });
  });

  it('translates a rect', () => {
    expect(rectTranslate(rectA, 5, 5)).toEqual([5, 5, 15, 15]);
    expect(rectTranslate(rectA, -1, -1)).toEqual([-1, -1, 9, 9]);
  });

  it('normalizes inverted rect', () => {
    const inverted: PdfRect = [10, 10, 0, 0];
    expect(rectNormalize(inverted)).toEqual([0, 0, 10, 10]);
  });
});
