// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/ai-adapter — Public API ───

export type {
  AIAdapter,
  AIAdapterEmbedding,
  AIAdapterStreaming,
  AICompleteOptions,
  AICompleteResult,
  AIError,
  AIMessage,
  AIStreamChunk,
  AIStructuredOptions,
  AIStructuredResult,
  AIUsage,
  JSONSchema,
  RedactionHook,
} from './types';
export { isAIError, supportsEmbedding, supportsStreaming } from './types';

// Reference adapters. Echo is always available; OpenAI and Anthropic are
// network-dependent but ship in the same package so consumers don't have to
// install a separate adapter package per vendor.
export { EchoAdapter, synthesizeFromSchema } from './adapters/echo';
export type { EchoAdapterOptions } from './adapters/echo';

export { OpenAIAdapter } from './adapters/openai';
export type { OpenAIAdapterOptions } from './adapters/openai';

export { AnthropicAdapter } from './adapters/anthropic';
export type { AnthropicAdapterOptions } from './adapters/anthropic';

// Helpers — consumers usually don't need these, but adapter authors do.
export { applyRedaction, chainAbort, statusToErrorKind, wrapAIError } from './utils';
