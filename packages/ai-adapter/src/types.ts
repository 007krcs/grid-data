// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── @gridstorm/ai-adapter — Core type model ────────────────────────────────
//
// The shape of this module is the contract between GridStorm plugins
// (consumers) and any LLM provider (implementations). Every existing and
// future AI-using plugin — plugin-nl-query (LLM-backed), cell autocomplete,
// formula suggestion, explain-mode, summarization — accepts a single
// `aiAdapter: AIAdapter` config. Vendor lock-in is therefore impossible by
// construction; consumers swap adapters without touching any plugin code.
//
// Design rules baked in here:
//
//   1. ASYNC. Every method returns a Promise. Streaming is opt-in.
//   2. STRUCTURED OUTPUT IS FIRST-CLASS. `completeStructured()` returns
//      validated JSON keyed to a JSON Schema. This is how plugins ask for
//      machine-actionable results (sort models, filter operations, code
//      snippets) without parsing prose.
//   3. PRIVACY IS THE CALLER'S CONTRACT. The adapter sees whatever the
//      consumer sends. Plugins are expected to redact PII before invocation;
//      `RedactionHook` exists so the redaction logic can be centralized.
//   4. NO HIDDEN STATE. The adapter MAY cache tokens internally, but its
//      observable behavior must depend only on inputs — same prompt + same
//      options ⇒ same logical outcome. This lets us record/replay in tests.
//   5. ERRORS ARE TYPED. `AIError` discriminated union — consumers can
//      branch on `kind` to retry rate-limits, surface auth errors, etc.

/**
 * A single message in a multi-turn conversation. Roles match the OpenAI /
 * Anthropic / OpenChat conventions — `system` for prelude instructions,
 * `user` for human input, `assistant` for model output.
 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Options passed on every call. Adapters pick which fields they honor; the
 * interface is the union of "things common across major vendors" so plugins
 * can rely on broad availability. Anything vendor-specific belongs in the
 * adapter's own constructor options, not here.
 */
export interface AICompleteOptions {
  /** Model identifier (e.g. "gpt-4o", "claude-3-5-sonnet-20240620"). */
  model?: string;
  /** 0–2, where higher = more creative. Default depends on adapter. */
  temperature?: number;
  /** Max tokens in the completion. */
  maxTokens?: number;
  /** Optional stop sequences. */
  stop?: string[];
  /** Caller-provided abort signal — adapter must honor it. */
  signal?: AbortSignal;
  /** Optional per-call redaction; runs over messages before send. */
  redact?: RedactionHook;
  /** Free-form metadata — adapters MAY pass to vendor for observability. */
  metadata?: Record<string, string>;
}

export interface AICompleteResult {
  /** The model's response text. */
  text: string;
  /** Vendor-reported token usage, if available. */
  usage?: AIUsage;
  /** Stop reason — completion, length cap, abort, stop-sequence hit. */
  finishReason: 'stop' | 'length' | 'abort' | 'content-filter' | 'tool-call' | 'other';
  /** Free-form vendor metadata (request id, model fingerprint). */
  meta?: Record<string, unknown>;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * JSON Schema constraint used by `completeStructured`. We intentionally use
 * a minimal subset of JSON Schema (the shape every major vendor agrees on
 * via "structured outputs" / "JSON mode" / "tool use"):
 *   - `type` ∈ object | array | string | number | boolean
 *   - `properties` + `required` on objects
 *   - `items` on arrays
 *   - `enum` for closed sets
 *   - `description` for human and LLM context
 */
export type JSONSchema =
  | { type: 'object'; properties: Record<string, JSONSchema>; required?: string[]; description?: string }
  | { type: 'array'; items: JSONSchema; description?: string }
  | { type: 'string'; enum?: string[]; description?: string }
  | { type: 'number'; description?: string }
  | { type: 'boolean'; description?: string };

export interface AIStructuredOptions<T> extends AICompleteOptions {
  /** Schema the result is validated against. Pass a runtime validator if
   *  stricter checks than the structural JSON Schema are needed — adapters
   *  call it after their own validation. */
  schema: JSONSchema;
  /** Optional runtime validator. Returns the parsed value or throws. */
  validate?: (raw: unknown) => T;
}

export interface AIStructuredResult<T> {
  data: T;
  usage?: AIUsage;
  finishReason: AICompleteResult['finishReason'];
  meta?: Record<string, unknown>;
}

/**
 * Redaction hook. Runs over every message before send. Implementations can
 * replace PII (emails, names, account numbers) with placeholders, or drop
 * entire messages. Return the modified message array.
 *
 * Plugins that hold sensitive cell content are expected to wire this from
 * their config to the adapter call — the adapter does NOT add a default,
 * because what counts as PII is application-specific.
 */
export type RedactionHook = (messages: AIMessage[]) => AIMessage[];

/**
 * Discriminated error union — every adapter throws errors that conform.
 * Consumers `catch (e: AIError)` and branch on `e.kind`. Wrap unknown errors
 * via `wrapAIError(e)` (see utils).
 */
export type AIError =
  | { kind: 'auth'; message: string; status?: number }
  | { kind: 'rate-limit'; message: string; retryAfterMs?: number }
  | { kind: 'invalid-request'; message: string; details?: unknown }
  | { kind: 'content-filter'; message: string }
  | { kind: 'network'; message: string; cause?: unknown }
  | { kind: 'abort'; message: string }
  | { kind: 'parse'; message: string; raw?: string }
  | { kind: 'unknown'; message: string; cause?: unknown };

export function isAIError(e: unknown): e is AIError {
  return (
    typeof e === 'object' &&
    e !== null &&
    'kind' in e &&
    typeof (e as { kind: unknown }).kind === 'string'
  );
}

/**
 * The contract. Every adapter implements this. Plugins depend on this
 * interface, never on a concrete adapter — so consumers can pick OpenAI,
 * Anthropic, a local model, or a test echo and nothing else in the system
 * changes.
 */
export interface AIAdapter {
  /** Vendor identifier — used for logging and telemetry. */
  readonly name: string;

  /**
   * Plain text completion. The most common path — NL query, summarization,
   * explain-mode all use this.
   */
  complete(messages: AIMessage[], options?: AICompleteOptions): Promise<AICompleteResult>;

  /**
   * Schema-constrained completion. Used when the plugin needs a structured
   * result it can act on (sort model, filter conditions, formula).
   * Implementations are responsible for routing through the vendor's
   * structured-output mechanism (OpenAI JSON mode / function calling,
   * Anthropic tool_use, etc.) and re-validating the parsed JSON against
   * the schema before returning.
   */
  completeStructured<T = unknown>(
    messages: AIMessage[],
    options: AIStructuredOptions<T>,
  ): Promise<AIStructuredResult<T>>;
}

/**
 * Optional capability surface. Adapters that support a feature implement
 * the corresponding method; consumers feature-detect via `typeof`. This
 * keeps the core `AIAdapter` interface small while leaving room to grow.
 */
export interface AIAdapterStreaming {
  /**
   * Stream the completion token by token. Returns an async iterable of
   * chunks; the final chunk includes finishReason and (optionally) usage.
   */
  completeStream(
    messages: AIMessage[],
    options?: AICompleteOptions,
  ): AsyncIterable<AIStreamChunk>;
}

export interface AIStreamChunk {
  /** Cumulative text up to and including this chunk. */
  text: string;
  /** Just the delta added in this chunk. */
  delta: string;
  done: boolean;
  finishReason?: AICompleteResult['finishReason'];
  usage?: AIUsage;
}

export interface AIAdapterEmbedding {
  /** Embed a batch of strings as vectors. */
  embed(texts: string[], options?: { model?: string; signal?: AbortSignal }): Promise<number[][]>;
}

export function supportsStreaming(adapter: AIAdapter): adapter is AIAdapter & AIAdapterStreaming {
  return typeof (adapter as Partial<AIAdapterStreaming>).completeStream === 'function';
}

export function supportsEmbedding(adapter: AIAdapter): adapter is AIAdapter & AIAdapterEmbedding {
  return typeof (adapter as Partial<AIAdapterEmbedding>).embed === 'function';
}
