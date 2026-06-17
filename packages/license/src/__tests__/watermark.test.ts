// © 2026 GridStorm Contributors — MIT License
//
// Watermarks were removed when the commercial layer was dropped. These
// tests confirm the stubs are no-ops: nothing gets injected into the DOM
// and removal is harmless.

import { describe, it, expect, beforeEach } from 'vitest';
import { createWatermark, removeWatermark } from '../watermark';

describe('Watermark (no-op stubs)', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('createWatermark injects nothing', () => {
    createWatermark(container);
    expect(container.children.length).toBe(0);
    expect(container.querySelector('#__gridstorm_watermark__')).toBeNull();
  });

  it('removeWatermark is safe when no watermark exists', () => {
    expect(() => removeWatermark(container)).not.toThrow();
    expect(container.children.length).toBe(0);
  });

  it('repeated calls remain inert', () => {
    createWatermark(container);
    createWatermark(container);
    removeWatermark(container);
    removeWatermark(container);
    expect(container.children.length).toBe(0);
  });
});
