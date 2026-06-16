// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── EchoAdapter ───────────────────────────────────────────────────────────
//
// Deterministic no-network adapter for tests and offline / no-API-key fallback.
// Always returns a predictable answer derived from the input. Implements both
// complete() and completeStructured() — the structured path returns a value
// constructed by walking the schema, which keeps tests honest about handling
// every JSON Schema branch the adapter supports.
//
// Why ship this in the public package rather than as a test helper?
//   1. Plugins like plugin-nl-query default to Echo when no real adapter is
//      configured, so the feature degrades gracefully instead of throwing.
//   2. Storybook stories use Echo so the AI features have a meaningful "demo
//      without keys" state.
//   3. End-to-end tests across the monorepo rely on it for reproducibility.

import type {
  AIAdapter,
  AIAdapterEmbedding,
  AIAdapterStreaming,
  AICompleteOptions,
  AICompleteResult,
  AIMessage,
  AIStreamChunk,
  AIStructuredOptions,
  AIStructuredResult,
  JSONSchema,
} from '../types';
import { applyRedaction } from '../utils';

export interface EchoAdapterOptions {
  /**
   * Default response for plain `complete()`. If a function, called with the
   * messages and returns the response text. If a string, used verbatim.
   * Default: echo back the LAST user message.
   */
  respond?: string | ((messages: AIMessage[]) => string);
  /**
   * Simulated latency in ms. Useful for testing UI behavior under realistic
   * timing. Default: 0.
   */
  latencyMs?: number;
}

export class EchoAdapter implements AIAdapter, AIAdapterStreaming, AIAdapterEmbedding {
  readonly name = 'echo';

  constructor(private options: EchoAdapterOptions = {}) {}

  async complete(messages: AIMessage[], options: AICompleteOptions = {}): Promise<AICompleteResult> {
    const redacted = applyRedaction(messages, options.redact);
    await this.sleep(options.signal);
    const text = this.resolveResponse(redacted);
    return {
      text,
      usage: this.estimateUsage(redacted, text),
      finishReason: 'stop',
      meta: { adapter: 'echo' },
    };
  }

  async completeStructured<T = unknown>(
    messages: AIMessage[],
    options: AIStructuredOptions<T>,
  ): Promise<AIStructuredResult<T>> {
    const redacted = applyRedaction(messages, options.redact);
    await this.sleep(options.signal);
    const synthesized = synthesizeFromSchema(options.schema) as unknown;
    const validated = options.validate ? options.validate(synthesized) : (synthesized as T);
    return {
      data: validated,
      usage: this.estimateUsage(redacted, JSON.stringify(synthesized)),
      finishReason: 'stop',
      meta: { adapter: 'echo' },
    };
  }

  async *completeStream(
    messages: AIMessage[],
    options: AICompleteOptions = {},
  ): AsyncIterable<AIStreamChunk> {
    const redacted = applyRedaction(messages, options.redact);
    const text = this.resolveResponse(redacted);
    // Stream word-by-word for the demo so consumers can see chunked rendering
    // actually do something. Real adapters split by token.
    const words = text.split(/(\s+)/);
    let cumulative = '';
    for (let i = 0; i < words.length; i++) {
      if (options.signal?.aborted) {
        yield { text: cumulative, delta: '', done: true, finishReason: 'abort' };
        return;
      }
      const delta = words[i]!;
      cumulative += delta;
      const isLast = i === words.length - 1;
      yield {
        text: cumulative,
        delta,
        done: isLast,
        finishReason: isLast ? 'stop' : undefined,
        usage: isLast ? this.estimateUsage(redacted, cumulative) : undefined,
      };
      if (!isLast) await this.sleep(undefined, 5);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    // Deterministic pseudo-embedding: 8-dim vector from a tiny hash. Useless
    // for semantic similarity, but stable for tests asserting that vectors
    // round-trip through whatever index/store consumers wire up.
    return texts.map((t) => {
      const v = new Array(8).fill(0);
      for (let i = 0; i < t.length; i++) {
        v[i % 8] = (v[i % 8] + t.charCodeAt(i)) % 1000;
      }
      const max = Math.max(1, ...v.map((x) => Math.abs(x)));
      return v.map((x) => x / max);
    });
  }

  private resolveResponse(messages: AIMessage[]): string {
    if (typeof this.options.respond === 'function') {
      return this.options.respond(messages);
    }
    if (typeof this.options.respond === 'string') {
      return this.options.respond;
    }
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    return lastUser ? `[echo] ${lastUser.content}` : '[echo]';
  }

  private estimateUsage(messages: AIMessage[], text: string) {
    // Token estimate: 1 token ≈ 4 characters. Crude but matches real-world
    // ranges close enough for cost-tracking sanity checks in tests.
    const promptTokens = Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 4);
    const completionTokens = Math.ceil(text.length / 4);
    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private async sleep(signal?: AbortSignal, overrideMs?: number): Promise<void> {
    const ms = overrideMs ?? this.options.latencyMs ?? 0;
    if (ms <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(resolve, ms);
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject({ kind: 'abort', message: 'aborted' });
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }
}

/**
 * Walk a JSON Schema and produce a representative value. Used by Echo for
 * `completeStructured`. Exported for reuse in tests that need to fabricate
 * a schema-compliant payload.
 */
export function synthesizeFromSchema(schema: JSONSchema): unknown {
  switch (schema.type) {
    case 'string':
      return schema.enum?.[0] ?? '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'array':
      return [synthesizeFromSchema(schema.items)];
    case 'object': {
      const out: Record<string, unknown> = {};
      for (const [key, sub] of Object.entries(schema.properties)) {
        out[key] = synthesizeFromSchema(sub);
      }
      return out;
    }
  }
}
