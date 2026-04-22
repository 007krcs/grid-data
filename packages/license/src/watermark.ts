// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
const WATERMARK_ID = '__gridstorm_watermark__';

/**
 * Create a watermark overlay on the grid container.
 * Called when an enterprise plugin is used without a valid license in production.
 */
export function createWatermark(container: HTMLElement): void {
  // Don't create duplicate watermarks
  if (container.querySelector(`#${WATERMARK_ID}`)) return;

  const overlay = document.createElement('div');
  overlay.id = WATERMARK_ID;
  overlay.setAttribute('aria-hidden', 'true');

  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    pointerEvents: 'none',
    zIndex: '9999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  });

  // Create diagonal repeating watermark text
  const text = document.createElement('div');
  Object.assign(text.style, {
    transform: 'rotate(-30deg)',
    fontSize: '24px',
    fontFamily: 'Arial, sans-serif',
    fontWeight: '700',
    color: 'rgba(255, 0, 0, 0.12)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    lineHeight: '3',
  });

  // Repeat the watermark text to fill the area
  const line = 'GRIDSTORM UNLICENSED   ';
  text.textContent = (line.repeat(5) + '\n').repeat(10);
  text.style.whiteSpace = 'pre';

  overlay.appendChild(text);

  // The container needs relative positioning
  const containerPos = window.getComputedStyle(container).position;
  if (containerPos === 'static') {
    container.style.position = 'relative';
  }

  container.appendChild(overlay);
}

/**
 * Remove the watermark overlay from a grid container.
 */
export function removeWatermark(container: HTMLElement): void {
  const overlay = container.querySelector(`#${WATERMARK_ID}`);
  if (overlay) overlay.remove();
}
