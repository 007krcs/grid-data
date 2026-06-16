// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// Shared helpers used by every adapter.

import type { AIError, AIMessage, RedactionHook } from './types';
import { isAIError } from './types';

/** Wrap an unknown thrown value into the AIError union. */
export function wrapAIError(e: unknown): AIError {
  if (isAIError(e)) return e;
  if (e instanceof Error) {
    if (e.name === 'AbortError') {
      return { kind: 'abort', message: e.message };
    }
    if (/network|fetch failed|ENOTFOUND|ECONNREFUSED/i.test(e.message)) {
      return { kind: 'network', message: e.message, cause: e };
    }
    return { kind: 'unknown', message: e.message, cause: e };
  }
  return { kind: 'unknown', message: String(e), cause: e };
}

/** Apply the redaction hook if present; otherwise pass through. */
export function applyRedaction(
  messages: AIMessage[],
  redact?: RedactionHook,
): AIMessage[] {
  if (!redact) return messages;
  try {
    const out = redact(messages);
    if (!Array.isArray(out)) {
      throw new Error('redaction hook must return an array of AIMessage');
    }
    return out;
  } catch (e) {
    // Redaction failure is fail-CLOSED: refuse to send the original payload.
    const message = e instanceof Error ? e.message : String(e);
    throw {
      kind: 'invalid-request',
      message: `redaction hook threw: ${message}`,
      details: e,
    } satisfies AIError;
  }
}

/**
 * Map an HTTP status code to the corresponding AIError kind. Used by HTTP-
 * backed adapters (OpenAI, Anthropic) to produce uniform error shapes
 * regardless of the vendor's bespoke error envelopes.
 */
export function statusToErrorKind(status: number): AIError['kind'] {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate-limit';
  if (status >= 400 && status < 500) return 'invalid-request';
  return 'unknown';
}

/**
 * Build the AbortSignal that times out after `ms`, optionally chained with
 * the caller's signal so either source aborts the request. Adapters use this
 * to enforce a sane upper bound on each call regardless of vendor latency.
 */
export function chainAbort(
  ms: number,
  outer?: AbortSignal,
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), ms);
  let outerListener: (() => void) | undefined;
  if (outer) {
    if (outer.aborted) {
      controller.abort(outer.reason);
    } else {
      outerListener = () => controller.abort(outer.reason);
      outer.addEventListener('abort', outerListener, { once: true });
    }
  }
  return {
    signal: controller.signal,
    cancel: () => {
      clearTimeout(timer);
      if (outer && outerListener) outer.removeEventListener('abort', outerListener);
    },
  };
}
