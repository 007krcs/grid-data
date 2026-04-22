// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Geometry Utilities ───

import type { PdfRect } from '../types/document';

/** Check if two rectangles intersect. */
export function rectsIntersect(a: PdfRect, b: PdfRect): boolean {
  return a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
}

/** Check if rectangle `inner` is fully contained within `outer`. */
export function rectContains(outer: PdfRect, inner: PdfRect): boolean {
  return inner[0] >= outer[0] && inner[1] >= outer[1] &&
         inner[2] <= outer[2] && inner[3] <= outer[3];
}

/** Check if a point is inside a rectangle. */
export function pointInRect(x: number, y: number, rect: PdfRect): boolean {
  return x >= rect[0] && x <= rect[2] && y >= rect[1] && y <= rect[3];
}

/** Get the union (bounding box) of two rectangles. */
export function rectUnion(a: PdfRect, b: PdfRect): PdfRect {
  return [
    Math.min(a[0], b[0]),
    Math.min(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.max(a[3], b[3]),
  ];
}

/** Get the width of a rectangle. */
export function rectWidth(rect: PdfRect): number {
  return rect[2] - rect[0];
}

/** Get the height of a rectangle. */
export function rectHeight(rect: PdfRect): number {
  return rect[3] - rect[1];
}

/** Get the center point of a rectangle. */
export function rectCenter(rect: PdfRect): { x: number; y: number } {
  return {
    x: (rect[0] + rect[2]) / 2,
    y: (rect[1] + rect[3]) / 2,
  };
}

/** Move a rectangle by delta. */
export function rectTranslate(rect: PdfRect, dx: number, dy: number): PdfRect {
  return [rect[0] + dx, rect[1] + dy, rect[2] + dx, rect[3] + dy];
}

/** Normalize a rectangle so x1<x2 and y1<y2. */
export function rectNormalize(rect: PdfRect): PdfRect {
  return [
    Math.min(rect[0], rect[2]),
    Math.min(rect[1], rect[3]),
    Math.max(rect[0], rect[2]),
    Math.max(rect[1], rect[3]),
  ];
}
