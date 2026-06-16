// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── OpenAIAdapter ─────────────────────────────────────────────────────────
//
// Thin adapter over the OpenAI Chat Completions API. Implementation goals:
//
//   • DEPEND ON FETCH ONLY. No `openai` SDK. The SDK pulls in node-fetch,
//     form-data, and a graph of utilities that bloat the published package
//     and make tree-shaking harder. Fetch is universal.
//
//   • RESPECT THE SCHEMA HOOK. For `completeStructured` we route through
//     OpenAI's "Structured Outputs" / `response_format: json_schema` so the
//     server-side enforces the schema. We re-validate on the client too —
//     belt-and-suspenders, in case OpenAI's enforcement drifts.
//
//   • TIMEOUT + ABORT. Every call has a max latency; the caller's
//     AbortSignal chains with our internal timeout via chainAbort().
//
//   • TYPED ERRORS. HTTP status codes map to the AIError discriminated
//     union via statusToErrorKind(). Consumers can branch on `e.kind` to
//     retry rate-limits without inspecting raw HTTP responses.

import type {
  AIAdapter,
  AICompleteOptions,
  AICompleteResult,
  AIError,
  AIMessage,
  AIStructuredOptions,
  AIStructuredResult,
} from '../types';
import { applyRedaction, chainAbort, statusToErrorKind, wrapAIError } from '../utils';

export interface OpenAIAdapterOptions {
  /** API key. Required. */
  apiKey: string;
  /** Default model — used when AICompleteOptions.model is unset. */
  defaultModel?: string;
  /** Base URL — override for Azure OpenAI or compatible proxies. */
  baseURL?: string;
  /** Default per-call timeout in ms. Default: 60_000. */
  timeoutMs?: number;
  /** Optional custom fetch (e.g. for tests). Defaults to globalThis.fetch. */
  fetchImpl?: typeof fetch;
  /** Optional OpenAI organization header. */
  organization?: string;
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
  response_format?: { type: 'json_schema'; json_schema: { name: string; strict: true; schema: unknown } };
  metadata?: Record<string, string>;
}

interface OpenAIChatChoice {
  index: number;
  message: { role: 'assistant'; content: string | null };
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call' | null;
}

interface OpenAIChatResponse {
  id: string;
  model: string;
  choices: OpenAIChatChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export class OpenAIAdapter implements AIAdapter {
  readonly name = 'openai';
  private readonly fetch: typeof fetch;

  constructor(private options: OpenAIAdapterOptions) {
    if (!options.apiKey) {
      // Fail fast — calling the adapter later without a key produces
      // confusing 401s. Better to surface the misconfiguration at
      // construction time.
      throw {
        kind: 'auth',
        message: 'OpenAIAdapter requires an apiKey',
      } satisfies AIError;
    }
    this.fetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async complete(
    messages: AIMessage[],
    options: AICompleteOptions = {},
  ): Promise<AICompleteResult> {
    const redacted = applyRedaction(messages, options.redact);
    const body: OpenAIChatRequest = {
      model: options.model ?? this.options.defaultModel ?? 'gpt-4o-mini',
      messages: redacted,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stop: options.stop,
      metadata: options.metadata,
    };
    const result = await this.callChat(body, options.signal);
    const choice = result.choices[0];
    return {
      text: choice?.message.content ?? '',
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
      finishReason: mapFinishReason(choice?.finish_reason ?? null),
      meta: { adapter: 'openai', requestId: result.id, model: result.model },
    };
  }

  async completeStructured<T = unknown>(
    messages: AIMessage[],
    options: AIStructuredOptions<T>,
  ): Promise<AIStructuredResult<T>> {
    const redacted = applyRedaction(messages, options.redact);
    const body: OpenAIChatRequest = {
      model: options.model ?? this.options.defaultModel ?? 'gpt-4o-mini',
      messages: redacted,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      stop: options.stop,
      // The "strict: true" flag is the gate that puts OpenAI's server-side
      // schema enforcement in play. Without it, response_format becomes a
      // soft hint that the model usually but not always honors.
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'gridstorm_structured', strict: true, schema: options.schema },
      },
      metadata: options.metadata,
    };
    const result = await this.callChat(body, options.signal);
    const choice = result.choices[0];
    const raw = choice?.message.content ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw {
        kind: 'parse',
        message: e instanceof Error ? e.message : String(e),
        raw,
      } satisfies AIError;
    }
    const validated = options.validate ? options.validate(parsed) : (parsed as T);
    return {
      data: validated,
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
      finishReason: mapFinishReason(choice?.finish_reason ?? null),
      meta: { adapter: 'openai', requestId: result.id, model: result.model },
    };
  }

  private async callChat(
    body: OpenAIChatRequest,
    outerSignal?: AbortSignal,
  ): Promise<OpenAIChatResponse> {
    const url = `${this.options.baseURL ?? 'https://api.openai.com/v1'}/chat/completions`;
    const { signal, cancel } = chainAbort(this.options.timeoutMs ?? 60_000, outerSignal);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: `Bearer ${this.options.apiKey}`,
    };
    if (this.options.organization) headers['openai-organization'] = this.options.organization;
    let res: Response;
    try {
      res = await this.fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal,
      });
    } catch (e) {
      cancel();
      throw wrapAIError(e);
    }
    cancel();
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'));
      throw {
        kind: statusToErrorKind(res.status),
        message: `OpenAI HTTP ${res.status}: ${text.slice(0, 500)}`,
        status: res.status,
        ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      } satisfies AIError;
    }
    return (await res.json()) as OpenAIChatResponse;
  }
}

function mapFinishReason(r: OpenAIChatChoice['finish_reason']): AICompleteResult['finishReason'] {
  switch (r) {
    case 'stop':
      return 'stop';
    case 'length':
      return 'length';
    case 'content_filter':
      return 'content-filter';
    case 'tool_calls':
    case 'function_call':
      return 'tool-call';
    default:
      return 'other';
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  // Some implementations send an HTTP-date; punt.
  return undefined;
}
