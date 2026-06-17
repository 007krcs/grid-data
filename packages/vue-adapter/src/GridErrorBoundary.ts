// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── GridErrorBoundary (Vue) ───
//
// Vue 3 analogue of the React adapter's GridErrorBoundary. Wrap a grid in
// this component to catch errors thrown by descendant Vue components
// (renderer functions, cell renderers, composables) and render a fallback
// instead of letting the whole app unmount.
//
// Caveats:
//   • `onErrorCaptured` fires for Vue render/lifecycle errors. It does NOT
//     fire for async errors in non-Vue callbacks (event handlers, promise
//     rejections, observers) — Vue can't see them.
//   • Errors thrown synchronously during the GridStorm engine's own setup
//     are not caught here unless they bubble through a child's setup; the
//     engine is built outside the boundary's render tree.

import { defineComponent, h, ref, type PropType, type VNode } from 'vue';

export interface GridErrorFallbackInfo {
  error: Error;
  info: string;
  reset: () => void;
}

export const GridErrorBoundary = defineComponent({
  name: 'GridErrorBoundary',
  props: {
    onError: {
      type: Function as PropType<(err: Error, info: string) => void>,
      default: undefined,
    },
    fallback: {
      type: Function as PropType<(info: GridErrorFallbackInfo) => VNode>,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const error = ref<Error | null>(null);
    const errorInfo = ref<string>('');

    const reset = (): void => {
      error.value = null;
      errorInfo.value = '';
    };

    return () => {
      if (error.value) {
        if (props.fallback) {
          return props.fallback({ error: error.value, info: errorInfo.value, reset });
        }
        return h(
          'div',
          {
            class: 'gs-error-boundary',
            role: 'alert',
            style: {
              padding: '12px',
              border: '1px solid #fca5a5',
              background: '#fef2f2',
              color: '#7f1d1d',
              borderRadius: '4px',
              fontFamily: 'system-ui, sans-serif',
              fontSize: '13px',
            },
          },
          [
            h('strong', { style: { display: 'block', marginBottom: '4px' } }, 'GridStorm error'),
            h('div', { style: { marginBottom: '6px' } }, error.value.message),
            h(
              'button',
              {
                type: 'button',
                onClick: reset,
                style: {
                  fontSize: '12px',
                  padding: '4px 10px',
                  border: '1px solid #b91c1c',
                  background: 'white',
                  color: '#7f1d1d',
                  borderRadius: '3px',
                  cursor: 'pointer',
                },
              },
              'Retry',
            ),
          ],
        );
      }
      return slots.default ? slots.default() : null;
    };
  },
  errorCaptured(err: unknown, _instance, info: string) {
    const e = err instanceof Error ? err : new Error(String(err));
    // `this` is the component instance; TS doesn't know about our state refs
    // so we reach for them by name. Vue keeps refs as data-like accessors.
    const self = this as unknown as {
      error?: { value: Error | null };
      errorInfo?: { value: string };
      $props?: { onError?: (e: Error, info: string) => void };
    };
    if (self.error) self.error.value = e;
    if (self.errorInfo) self.errorInfo.value = info;
    self.$props?.onError?.(e, info);
    // Stop propagation: we've handled it.
    return false;
  },
});
