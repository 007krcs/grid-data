// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for the AI adapter contracts. Echo gets full coverage; OpenAI and
// Anthropic are tested via a stub fetch so the wire shape is exercised
// without depending on real API keys or network.

import { describe, expect, it, vi } from 'vitest';
import {
  AnthropicAdapter,
  EchoAdapter,
  OpenAIAdapter,
  applyRedaction,
  isAIError,
  supportsEmbedding,
  supportsStreaming,
  synthesizeFromSchema,
  wrapAIError,
  type AIError,
  type AIMessage,
  type JSONSchema,
} from '../index';

// ─── EchoAdapter ────────────────────────────────────────────────────────────

describe('EchoAdapter', () => {
  it('echoes the last user message by default', async () => {
    const adapter = new EchoAdapter();
    const result = await adapter.complete([
      { role: 'system', content: 'be terse' },
      { role: 'user', content: 'ping' },
    ]);
    expect(result.text).toBe('[echo] ping');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBeGreaterThan(0);
  });

  it('uses a static respond string when configured', async () => {
    const adapter = new EchoAdapter({ respond: 'hello world' });
    const result = await adapter.complete([{ role: 'user', content: 'whatever' }]);
    expect(result.text).toBe('hello world');
  });

  it('uses a respond function when provided', async () => {
    const adapter = new EchoAdapter({
      respond: (messages) => `saw ${messages.length} messages`,
    });
    const result = await adapter.complete([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ]);
    expect(result.text).toBe('saw 3 messages');
  });

  it('completeStructured synthesizes a schema-shaped object', async () => {
    const adapter = new EchoAdapter();
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['sort', 'filter'] },
        column: { type: 'string' },
        ascending: { type: 'boolean' },
      },
      required: ['action', 'column', 'ascending'],
    };
    const result = await adapter.completeStructured([{ role: 'user', content: 'sort by name' }], {
      schema,
    });
    expect(result.data).toEqual({ action: 'sort', column: '', ascending: false });
  });

  it('completeStream yields chunks ending with done=true', async () => {
    const adapter = new EchoAdapter({ respond: 'one two three' });
    const chunks: { text: string; delta: string; done: boolean }[] = [];
    for await (const chunk of adapter.completeStream([{ role: 'user', content: 'x' }])) {
      chunks.push({ text: chunk.text, delta: chunk.delta, done: chunk.done });
    }
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1]!.done).toBe(true);
    expect(chunks[chunks.length - 1]!.text).toBe('one two three');
  });

  it('embeds texts into deterministic vectors', async () => {
    const adapter = new EchoAdapter();
    const a = await adapter.embed(['foo', 'bar']);
    const b = await adapter.embed(['foo', 'bar']);
    expect(a).toEqual(b); // determinism
    expect(a[0]).toHaveLength(8);
  });

  it('supportsStreaming / supportsEmbedding feature detection', () => {
    const adapter = new EchoAdapter();
    expect(supportsStreaming(adapter)).toBe(true);
    expect(supportsEmbedding(adapter)).toBe(true);
  });
});

// ─── Schema synthesis ───────────────────────────────────────────────────────

describe('synthesizeFromSchema', () => {
  it('walks every JSON Schema branch', () => {
    expect(synthesizeFromSchema({ type: 'string' })).toBe('');
    expect(synthesizeFromSchema({ type: 'string', enum: ['a', 'b'] })).toBe('a');
    expect(synthesizeFromSchema({ type: 'number' })).toBe(0);
    expect(synthesizeFromSchema({ type: 'boolean' })).toBe(false);
    expect(synthesizeFromSchema({ type: 'array', items: { type: 'number' } })).toEqual([0]);
    expect(
      synthesizeFromSchema({
        type: 'object',
        properties: { x: { type: 'number' }, y: { type: 'boolean' } },
      }),
    ).toEqual({ x: 0, y: false });
  });
});

// ─── Redaction + error helpers ──────────────────────────────────────────────

describe('applyRedaction', () => {
  it('returns the original messages when no hook is provided', () => {
    const messages: AIMessage[] = [{ role: 'user', content: 'hi' }];
    expect(applyRedaction(messages)).toBe(messages);
  });

  it('passes messages through the hook', () => {
    const messages: AIMessage[] = [{ role: 'user', content: 'email me at test@example.com' }];
    const out = applyRedaction(messages, (msgs) =>
      msgs.map((m) => ({ ...m, content: m.content.replace(/\S+@\S+/, '[EMAIL]') })),
    );
    expect(out[0]!.content).toBe('email me at [EMAIL]');
  });

  it('throws an invalid-request error when the hook misbehaves', () => {
    const messages: AIMessage[] = [{ role: 'user', content: 'hi' }];
    expect(() =>
      applyRedaction(messages, () => 'not an array' as unknown as AIMessage[]),
    ).toThrow();
    try {
      applyRedaction(messages, () => 'not an array' as unknown as AIMessage[]);
    } catch (e) {
      expect(isAIError(e)).toBe(true);
      expect((e as AIError).kind).toBe('invalid-request');
    }
  });
});

describe('wrapAIError', () => {
  it('passes through existing AIErrors', () => {
    const e: AIError = { kind: 'auth', message: 'no key' };
    expect(wrapAIError(e)).toBe(e);
  });
  it('detects abort errors', () => {
    const e = new Error('aborted');
    e.name = 'AbortError';
    expect(wrapAIError(e).kind).toBe('abort');
  });
  it('detects network errors', () => {
    expect(wrapAIError(new Error('fetch failed')).kind).toBe('network');
  });
  it('wraps unknowns', () => {
    expect(wrapAIError(42)).toMatchObject({ kind: 'unknown' });
  });
});

// ─── OpenAIAdapter via stub fetch ───────────────────────────────────────────

describe('OpenAIAdapter', () => {
  function stubFetch(payload: unknown, status = 200) {
    return vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }

  it('throws auth error if constructed without apiKey', () => {
    expect(() => new OpenAIAdapter({ apiKey: '' })).toThrow();
  });

  it('issues a chat completion and unpacks the response', async () => {
    const fetchImpl = stubFetch({
      id: 'cmpl-1',
      model: 'gpt-4o-mini',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
    });
    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', fetchImpl: fetchImpl as any });
    const result = await adapter.complete([{ role: 'user', content: 'hi' }]);
    expect(result.text).toBe('hello');
    expect(result.finishReason).toBe('stop');
    expect(result.usage).toEqual({ promptTokens: 5, completionTokens: 2, totalTokens: 7 });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(String(url)).toBe('https://api.openai.com/v1/chat/completions');
    expect((init as RequestInit).headers).toMatchObject({
      authorization: 'Bearer sk-test',
      'content-type': 'application/json',
    });
  });

  it('maps 401 to auth error', async () => {
    const adapter = new OpenAIAdapter({
      apiKey: 'sk-test',
      fetchImpl: stubFetch({ error: 'unauthorized' }, 401) as any,
    });
    await expect(adapter.complete([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      kind: 'auth',
    });
  });

  it('maps 429 to rate-limit error and parses retry-after', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'slow down' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '12' },
        }),
    );
    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', fetchImpl: fetchImpl as any });
    try {
      await adapter.complete([{ role: 'user', content: 'hi' }]);
      throw new Error('expected throw');
    } catch (e) {
      const err = e as AIError;
      expect(err.kind).toBe('rate-limit');
      expect((err as { retryAfterMs?: number }).retryAfterMs).toBe(12000);
    }
  });

  it('completeStructured posts response_format and parses JSON', async () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: { x: { type: 'number' } },
      required: ['x'],
    };
    const fetchImpl = stubFetch({
      id: 'cmpl-2',
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '{"x":42}' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });
    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', fetchImpl: fetchImpl as any });
    const result = await adapter.completeStructured<{ x: number }>(
      [{ role: 'user', content: 'give me 42' }],
      { schema },
    );
    expect(result.data).toEqual({ x: 42 });
    const [, init] = fetchImpl.mock.calls[0]!;
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody.response_format.type).toBe('json_schema');
    expect(sentBody.response_format.json_schema.strict).toBe(true);
  });
});

// ─── AnthropicAdapter via stub fetch ────────────────────────────────────────

describe('AnthropicAdapter', () => {
  function stubFetch(payload: unknown, status = 200) {
    return vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
  }

  it('throws auth error if constructed without apiKey', () => {
    expect(() => new AnthropicAdapter({ apiKey: '' })).toThrow();
  });

  it('splits system prompts and concatenates text blocks', async () => {
    const fetchImpl = stubFetch({
      id: 'msg_1',
      model: 'claude-3-5-sonnet-20240620',
      content: [
        { type: 'text', text: 'hello ' },
        { type: 'text', text: 'world' },
      ],
      stop_reason: 'end_turn',
      usage: { input_tokens: 4, output_tokens: 2 },
    });
    const adapter = new AnthropicAdapter({ apiKey: 'sk-test', fetchImpl: fetchImpl as any });
    const result = await adapter.complete([
      { role: 'system', content: 'be friendly' },
      { role: 'system', content: 'be brief' },
      { role: 'user', content: 'hi' },
    ]);
    expect(result.text).toBe('hello world');
    expect(result.finishReason).toBe('stop');
    expect(result.usage?.totalTokens).toBe(6);
    const [, init] = fetchImpl.mock.calls[0]!;
    const sentBody = JSON.parse((init as RequestInit).body as string);
    // Two system messages should fold into one `system` string separated by
    // a blank line; the messages array should only contain the user turn.
    expect(sentBody.system).toBe('be friendly\n\nbe brief');
    expect(sentBody.messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('completeStructured forces a tool_use call and reads input', async () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: { col: { type: 'string' } },
      required: ['col'],
    };
    const fetchImpl = stubFetch({
      id: 'msg_2',
      model: 'claude-3-5-sonnet-20240620',
      content: [
        {
          type: 'tool_use',
          id: 'tool_1',
          name: 'gridstorm_structured_output',
          input: { col: 'name' },
        },
      ],
      stop_reason: 'tool_use',
      usage: { input_tokens: 3, output_tokens: 4 },
    });
    const adapter = new AnthropicAdapter({ apiKey: 'sk-test', fetchImpl: fetchImpl as any });
    const result = await adapter.completeStructured<{ col: string }>(
      [{ role: 'user', content: 'pick a column' }],
      { schema },
    );
    expect(result.data).toEqual({ col: 'name' });
    expect(result.finishReason).toBe('tool-call');
    const [, init] = fetchImpl.mock.calls[0]!;
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody.tool_choice).toEqual({ type: 'tool', name: 'gridstorm_structured_output' });
    expect(sentBody.tools).toHaveLength(1);
  });
});
