import { AppError } from '../utils/errors.js';
import { settingsService } from '../services/settings-service.js';

const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

export type ModelFinishReason = 'stop' | 'tool_calls';

export interface ModelToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface ModelToolCall {
  index: number;
  id: string;
  name: string;
  arguments: string;
}

export interface ModelToolCallMessage {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ModelMessage =
  | {
      role: 'system' | 'user';
      content: string | Array<Record<string, unknown>>;
      name?: string;
    }
  | {
      role: 'assistant';
      content: string | Array<Record<string, unknown>> | null;
      name?: string;
      tool_calls?: ModelToolCallMessage[];
    }
  | {
      role: 'tool';
      content: string;
      tool_call_id: string;
      name?: string;
    };

export type ModelStreamEvent =
  | { type: 'text-delta'; delta: string }
  | { type: 'tool-call-delta'; toolCall: ModelToolCall }
  | { type: 'finish'; reason: ModelFinishReason };

interface OpenAIErrorResponse {
  error?: {
    message?: string;
  };
  message?: string;
}

interface OpenAIStreamChunk {
  error?: {
    message?: string;
  };
  choices?: Array<{
    delta?: {
      content?: string | null;
      tool_calls?: OpenAIToolCallDelta[];
    };
    finish_reason?: string | null;
  }>;
}

interface OpenAIToolCallDelta {
  index?: number;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

interface RequestSignalController {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
}

export const modelClient = {
  async *streamChatCompletion(
    messages: ModelMessage[],
    tools?: ModelToolDefinition[],
    abortSignal?: AbortSignal,
  ): AsyncGenerator<ModelStreamEvent> {
    const settings = await settingsService.getSettings();
    const validationError = settingsService.validateSettings(settings);

    if (validationError) {
      throw new AppError('CONFIG_INCOMPLETE', validationError);
    }

    const endpoint = buildChatCompletionsUrl(settings.baseURL);
    const requestSignal = createRequestSignal(abortSignal, DEFAULT_REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model: settings.model,
          stream: true,
          messages,
          ...(tools && tools.length > 0 ? { tools } : {}),
        }),
        signal: requestSignal.signal,
      });

      if (!response.ok) {
        throw await createResponseError(response);
      }

      if (!response.body) {
        throw new Error('模型响应缺少流数据');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const toolCallStates = new Map<number, ModelToolCall>();
      let buffer = '';
      let finalReason: ModelFinishReason | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = extractSSEDataPayloads(buffer);
        buffer = parsed.remaining;

        for (const payload of parsed.payloads) {
          if (payload === '[DONE]') {
            continue;
          }

          const chunk = parseOpenAIChunk(payload);
          for (const event of parseChunkEvents(chunk, toolCallStates)) {
            if (event.type === 'finish') {
              finalReason = event.reason;
            }

            yield event;
          }
        }
      }

      buffer += decoder.decode();
      const trailing = extractSSEDataPayloads(buffer, true);

      for (const payload of trailing.payloads) {
        if (payload === '[DONE]') {
          continue;
        }

        const chunk = parseOpenAIChunk(payload);
        for (const event of parseChunkEvents(chunk, toolCallStates)) {
          if (event.type === 'finish') {
            finalReason = event.reason;
          }

          yield event;
        }
      }

      if (!finalReason) {
        throw new Error('模型流提前结束，缺少 finish_reason');
      }
    } catch (error) {
      throw normalizeRequestError(error, abortSignal, requestSignal.didTimeout());
    } finally {
      requestSignal.cleanup();
    }
  },
};

function buildChatCompletionsUrl(baseURL: string): string {
  const trimmed = baseURL.trim();
  if (!trimmed) {
    throw new AppError('CONFIG_INCOMPLETE', 'baseURL is required');
  }

  if (/\/chat\/completions\/?$/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const normalizedBaseURL = trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
    return new URL('chat/completions', normalizedBaseURL).toString();
  } catch {
    throw new AppError('CONFIG_INCOMPLETE', 'baseURL is invalid');
  }
}

function createRequestSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): RequestSignalController {
  const controller = new AbortController();
  let timeoutTriggered = false;

  const timeoutHandle = setTimeout(() => {
    timeoutTriggered = true;
    controller.abort();
  }, timeoutMs);

  const abortFromExternal = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternal();
    } else {
      externalSignal.addEventListener('abort', abortFromExternal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutHandle);
      externalSignal?.removeEventListener('abort', abortFromExternal);
    },
    didTimeout: () => timeoutTriggered,
  };
}

function extractSSEDataPayloads(
  rawBuffer: string,
  flush = false,
): { payloads: string[]; remaining: string } {
  const normalized = rawBuffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const segments = normalized.split('\n\n');
  const completeSegments = flush ? segments : segments.slice(0, -1);
  const remaining = flush ? '' : (segments.at(-1) ?? '');
  const payloads: string[] = [];

  for (const segment of completeSegments) {
    const payload = parseSSEEventData(segment);
    if (payload !== null) {
      payloads.push(payload);
    }
  }

  return { payloads, remaining };
}

function parseSSEEventData(segment: string): string | null {
  const dataLines = segment
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart());

  if (dataLines.length === 0) {
    return null;
  }

  return dataLines.join('\n');
}

function parseOpenAIChunk(payload: string): OpenAIStreamChunk {
  try {
    return JSON.parse(payload) as OpenAIStreamChunk;
  } catch {
    throw new Error(`无法解析模型流响应片段：${payload}`);
  }
}

function* parseChunkEvents(
  chunk: OpenAIStreamChunk,
  toolCallStates: Map<number, ModelToolCall>,
): Generator<ModelStreamEvent> {
  if (chunk.error?.message) {
    throw new Error(`模型返回错误：${chunk.error.message}`);
  }

  for (const choice of chunk.choices ?? []) {
    const delta = choice.delta;

    if (typeof delta?.content === 'string' && delta.content.length > 0) {
      yield {
        type: 'text-delta',
        delta: delta.content,
      };
    }

    for (const [toolIndex, toolCall] of (delta?.tool_calls ?? []).entries()) {
      const index = toolCall.index ?? toolIndex;
      const existing = toolCallStates.get(index) ?? {
        index,
        id: '',
        name: '',
        arguments: '',
      };

      const next: ModelToolCall = {
        index,
        id: toolCall.id ?? existing.id,
        name: toolCall.function?.name
          ? `${existing.name}${toolCall.function.name}`
          : existing.name,
        arguments: toolCall.function?.arguments
          ? `${existing.arguments}${toolCall.function.arguments}`
          : existing.arguments,
      };

      toolCallStates.set(index, next);
      yield {
        type: 'tool-call-delta',
        toolCall: next,
      };
    }

    if (choice.finish_reason === 'stop' || choice.finish_reason === 'tool_calls') {
      yield {
        type: 'finish',
        reason: choice.finish_reason,
      };
    }
  }
}

async function createResponseError(response: Response): Promise<Error> {
  const responseText = await response.text();
  const detail = extractErrorMessage(responseText);
  return new Error(
    `模型请求失败（${response.status} ${response.statusText}）：${detail ?? '未知错误'}`,
  );
}

function extractErrorMessage(responseText: string): string | null {
  if (!responseText) {
    return null;
  }

  try {
    const parsed = JSON.parse(responseText) as OpenAIErrorResponse;
    return parsed.error?.message ?? parsed.message ?? responseText;
  } catch {
    return responseText;
  }
}

function normalizeRequestError(
  error: unknown,
  externalSignal: AbortSignal | undefined,
  didTimeout: boolean,
): Error {
  if (didTimeout) {
    return new Error(`模型请求超时（${DEFAULT_REQUEST_TIMEOUT_MS}ms）`);
  }

  if (externalSignal?.aborted) {
    return createAbortError('模型请求已取消');
  }

  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return createAbortError('模型请求已取消');
    }

    if (
      error.message.startsWith('模型请求') ||
      error.message.startsWith('模型流') ||
      error.message.startsWith('模型返回') ||
      error.message.startsWith('无法解析模型流')
    ) {
      return error;
    }

    return new Error(`模型请求失败：${error.message}`);
  }

  return new Error('模型请求失败：未知错误');
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}
