// Polyfills for jsdom environment

// ResizeObserver is not available in jsdom
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// CSS.escape is not available in jsdom
if (typeof globalThis.CSS === 'undefined') {
  (globalThis as Record<string, unknown>).CSS = {};
}
if (typeof globalThis.CSS.escape !== 'function') {
  globalThis.CSS.escape = (value: string): string => {
    const str = String(value);
    const length = str.length;
    let result = '';

    for (let i = 0; i < length; i++) {
      const ch = str.charCodeAt(i);

      // Null character
      if (ch === 0x0000) {
        result += '\uFFFD';
        continue;
      }

      if (
        // Control characters
        (ch >= 0x0001 && ch <= 0x001f) ||
        ch === 0x007f ||
        // First character is a digit
        (i === 0 && ch >= 0x0030 && ch <= 0x0039) ||
        // Second character is a digit when first is a hyphen
        (i === 1 && ch >= 0x0030 && ch <= 0x0039 && str.charCodeAt(0) === 0x002d)
      ) {
        result += '\\' + ch.toString(16) + ' ';
        continue;
      }

      // Only hyphen at start
      if (i === 0 && length === 1 && ch === 0x002d) {
        result += '\\' + str.charAt(i);
        continue;
      }

      // Safe characters
      if (
        ch >= 0x0080 ||
        ch === 0x002d || // hyphen
        ch === 0x005f || // underscore
        (ch >= 0x0030 && ch <= 0x0039) || // digits
        (ch >= 0x0041 && ch <= 0x005a) || // uppercase
        (ch >= 0x0061 && ch <= 0x007a) // lowercase
      ) {
        result += str.charAt(i);
        continue;
      }

      result += '\\' + str.charAt(i);
    }

    return result;
  };
}
