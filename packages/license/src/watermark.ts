// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
const WATERMARK_ID = '__gridstorm_watermark__';
const WATERMARK_OBSERVER_KEY = '__gridstorm_watermark_observer__';

interface ContainerWithObserver extends HTMLElement {
  [WATERMARK_OBSERVER_KEY]?: MutationObserver;
}

/**
 * Create a watermark overlay on the grid container.
 * Called when an enterprise plugin is used without a valid license in production.
 *
 * A `MutationObserver` is also attached to the container so that if the
 * overlay is removed (DevTools delete, hostile script), it gets re-added
 * on the next microtask. This does NOT make the watermark unremovable —
 * a determined user can detach the observer or rewrite the DOM — but it
 * defeats the one-shot "delete the div" workaround. {@link removeWatermark}
 * cleanly tears down both the observer and the overlay.
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

  // Attach (or refresh) the re-add observer.
  attachWatermarkObserver(container);
}

function attachWatermarkObserver(container: HTMLElement): void {
  if (typeof MutationObserver === 'undefined') return;
  const c = container as ContainerWithObserver;
  // Tear down any previous observer to avoid duplicates after re-creation.
  c[WATERMARK_OBSERVER_KEY]?.disconnect();

  const observer = new MutationObserver((mutations) => {
    let needsReAdd = false;
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.removedNodes.forEach((n) => {
          if (n instanceof Element && n.id === WATERMARK_ID) {
            needsReAdd = true;
          }
        });
      }
    }
    if (needsReAdd && !container.querySelector(`#${WATERMARK_ID}`)) {
      // Re-add on the next microtask. The observer remains attached.
      Promise.resolve().then(() => {
        if (!container.querySelector(`#${WATERMARK_ID}`)) {
          createWatermark(container);
        }
      });
    }
  });

  observer.observe(container, { childList: true });
  c[WATERMARK_OBSERVER_KEY] = observer;
}

/**
 * Remove the watermark overlay and its re-add observer from a grid
 * container. This is the only sanctioned way to drop the overlay — direct
 * `element.remove()` will be undone by the observer.
 */
export function removeWatermark(container: HTMLElement): void {
  const c = container as ContainerWithObserver;
  const observer = c[WATERMARK_OBSERVER_KEY];
  if (observer) {
    observer.disconnect();
    delete c[WATERMARK_OBSERVER_KEY];
  }
  const overlay = container.querySelector(`#${WATERMARK_ID}`);
  if (overlay) overlay.remove();
}
