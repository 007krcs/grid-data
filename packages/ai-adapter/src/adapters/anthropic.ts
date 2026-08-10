// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── AnthropicAdapter ──────────────────────────────────────────────────────
//
// Thin adapter over the Anthropic Messages API (v1). Same design rules as
// OpenAIAdapter — fetch only, typed errors, abort + timeout chaining, schema
// enforcement via Anthropic's tool_use mechanism (which is how Claude does
// structured outputs).
//
// Notes specific to Anthropic:
//   • The Messages API splits "system" from the messages array; the system
//     prompt is a top-level field rather than a message with role=system.
//   • Structured output is achieved by defining a single tool whose
//     input_schema is the consumer's JSON Schema, then forcing the model
//     to call it via `tool_choice: { type: 'tool', name }`.
//   • Anthropic returns content as an array of blocks; we concatenate text
//     blocks for `complete()`.

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

export interface AnthropicAdapterOptions {
  apiKey: string;
  /**
   * Default model — used when AICompleteOptions.model is unset.
   * Defaults to `claude-opus-5`. (The previous default,
   * claude-3-5-sonnet-20240620, was retired by Anthropic in Oct 2025 and
   * now returns 404.)
   *
   * Note: on Claude Opus 4.7+ models the `temperature` option is rejected
   * by the API — leave AICompleteOptions.temperature unset for those.
   */
  defaultModel?: string;
  baseURL?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  anthropicVersion?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  system?: string;
  temperature?: number;
  stop_sequences?: string[];
  tools?: { name: string; description?: string; input_schema: unknown }[];
  tool_choice?: { type: 'tool'; name: string };
  metadata?: Record<string, string>;
}

interface AnthropicResponse {
  id: string;
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | null;
  usage: { input_tokens: number; output_tokens: number };
}

const STRUCTURED_TOOL_NAME = 'gridstorm_structured_output';

export class AnthropicAdapter implements AIAdapter {
  readonly name = 'anthropic';
  private readonly fetch: typeof fetch;

  constructor(private options: AnthropicAdapterOptions) {
    if (!options.apiKey) {
      throw {
        kind: 'auth',
        message: 'AnthropicAdapter requires an apiKey',
      } satisfies AIError;
    }
    this.fetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  async complete(
    messages: AIMessage[],
    options: AICompleteOptions = {},
  ): Promise<AICompleteResult> {
    const redacted = applyRedaction(messages, options.redact);
    const { system, conversation } = splitSystem(redacted);
    const body: AnthropicRequest = {
      model: options.model ?? this.options.defaultModel ?? 'claude-opus-5',
      max_tokens: options.maxTokens ?? 1024,
      messages: conversation,
      ...(system ? { system } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.stop ? { stop_sequences: options.stop } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
    };
    const result = await this.callMessages(body, options.signal);
    const text = result.content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return {
      text,
      usage: {
        promptTokens: result.usage.input_tokens,
        completionTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens,
      },
      finishReason: mapFinishReason(result.stop_reason),
      meta: { adapter: 'anthropic', requestId: result.id, model: result.model },
    };
  }

  async completeStructured<T = unknown>(
    messages: AIMessage[],
    options: AIStructuredOptions<T>,
  ): Promise<AIStructuredResult<T>> {
    const redacted = applyRedaction(messages, options.redact);
    const { system, conversation } = splitSystem(redacted);
    const body: AnthropicRequest = {
      model: options.model ?? this.options.defaultModel ?? 'claude-opus-5',
      max_tokens: options.maxTokens ?? 2048,
      messages: conversation,
      ...(system ? { system } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.stop ? { stop_sequences: options.stop } : {}),
      ...(options.metadata ? { metadata: options.metadata } : {}),
      tools: [
        {
          name: STRUCTURED_TOOL_NAME,
          description: 'Return the structured result via this tool. The input_schema below is authoritative.',
          input_schema: options.schema,
        },
      ],
      tool_choice: { type: 'tool', name: STRUCTURED_TOOL_NAME },
    };
    const result = await this.callMessages(body, options.signal);
    const toolUse = result.content.find((b): b is Extract<AnthropicContentBlock, { type: 'tool_use' }> =>
      b.type === 'tool_use' && b.name === STRUCTURED_TOOL_NAME,
    );
    if (!toolUse) {
      throw {
        kind: 'parse',
        message: `Anthropic did not return a tool_use block for ${STRUCTURED_TOOL_NAME}`,
        raw: JSON.stringify(result.content),
      } satisfies AIError;
    }
    const validated = options.validate ? options.validate(toolUse.input) : (toolUse.input as T);
    return {
      data: validated,
      usage: {
        promptTokens: result.usage.input_tokens,
        completionTokens: result.usage.output_tokens,
        totalTokens: result.usage.input_tokens + result.usage.output_tokens,
      },
      finishReason: mapFinishReason(result.stop_reason),
      meta: { adapter: 'anthropic', requestId: result.id, model: result.model },
    };
  }

  private async callMessages(
    body: AnthropicRequest,
    outerSignal?: AbortSignal,
  ): Promise<AnthropicResponse> {
    const url = `${this.options.baseURL ?? 'https://api.anthropic.com/v1'}/messages`;
    const { signal, cancel } = chainAbort(this.options.timeoutMs ?? 60_000, outerSignal);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': this.options.apiKey,
      'anthropic-version': this.options.anthropicVersion ?? '2023-06-01',
    };
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
        message: `Anthropic HTTP ${res.status}: ${text.slice(0, 500)}`,
        status: res.status,
        ...(retryAfterMs !== undefined ? { retryAfterMs } : {}),
      } satisfies AIError;
    }
    return (await res.json()) as AnthropicResponse;
  }
}

/**
 * Anthropic's Messages API splits the system prompt from the conversation.
 * We accept the unified AIMessage[] (which can carry system entries anywhere)
 * and reshape: every `system` message is concatenated into the top-level
 * `system` string; the rest become the `messages` array.
 */
function splitSystem(messages: AIMessage[]): { system?: string; conversation: AnthropicMessage[] } {
  const systemParts: string[] = [];
  const conversation: AnthropicMessage[] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systemParts.push(m.content);
    } else {
      conversation.push({ role: m.role, content: m.content });
    }
  }
  return {
    system: systemParts.length > 0 ? systemParts.join('\n\n') : undefined,
    conversation,
  };
}

function mapFinishReason(r: AnthropicResponse['stop_reason']): AICompleteResult['finishReason'] {
  switch (r) {
    case 'end_turn':
      return 'stop';
    case 'max_tokens':
      return 'length';
    case 'stop_sequence':
      return 'stop';
    case 'tool_use':
      return 'tool-call';
    default:
      return 'other';
  }
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  return undefined;
}
