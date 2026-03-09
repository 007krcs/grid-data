import { describe, it, expect, beforeEach } from 'vitest';
import { createWatermark, removeWatermark } from '../watermark';

describe('Watermark', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  describe('createWatermark', () => {
    it('should create a watermark overlay in the container', () => {
      createWatermark(container);

      const overlay = container.querySelector('#__gridstorm_watermark__');
      expect(overlay).not.toBeNull();
      expect(overlay!.getAttribute('aria-hidden')).toBe('true');
    });

    it('should not create duplicate watermarks', () => {
      createWatermark(container);
      createWatermark(container);

      const overlays = container.querySelectorAll('#__gridstorm_watermark__');
      expect(overlays.length).toBe(1);
    });

    it('should set container to relative positioning if static', () => {
      container.style.position = 'static';
      createWatermark(container);

      expect(container.style.position).toBe('relative');
    });

    it('should not change container positioning if already non-static', () => {
      container.style.position = 'absolute';
      createWatermark(container);

      expect(container.style.position).toBe('absolute');
    });

    it('should contain watermark text', () => {
      createWatermark(container);

      const overlay = container.querySelector('#__gridstorm_watermark__');
      expect(overlay!.textContent).toContain('GRIDSTORM UNLICENSED');
    });

    it('should have pointer-events none so grid is still usable', () => {
      createWatermark(container);

      const overlay = container.querySelector('#__gridstorm_watermark__') as HTMLElement;
      expect(overlay.style.pointerEvents).toBe('none');
    });
  });

  describe('removeWatermark', () => {
    it('should remove an existing watermark', () => {
      createWatermark(container);
      expect(container.querySelector('#__gridstorm_watermark__')).not.toBeNull();

      removeWatermark(container);
      expect(container.querySelector('#__gridstorm_watermark__')).toBeNull();
    });

    it('should do nothing if no watermark exists', () => {
      // Should not throw
      expect(() => removeWatermark(container)).not.toThrow();
    });
  });
});
