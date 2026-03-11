import { useRef, useCallback } from 'react';
import type { SSEEventType } from '@assistant/shared';

type SSEHandler = (event: SSEEventType, data: unknown) => void;

interface UseSSEStreamReturn {
  connect: (response: Response, onEvent: SSEHandler, onClose?: () => void) => void;
  disconnect: () => void;
}

/**
 * 解析 SSE 格式的 ReadableStream
 * 格式：event: <type>\ndata: <json>\n\n
 */
async function parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: SSEHandler,
  signal: AbortSignal,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按双换行分割事件
      const parts = buffer.split('\n\n');
      // 最后一段可能是不完整的，保留
      buffer = parts.pop() ?? '';

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType: string = 'message';
        let dataStr = '';

        for (const line of part.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice('event: '.length).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice('data: '.length).trim();
          }
        }

        if (!dataStr) continue;

        let data: unknown;
        try {
          data = JSON.parse(dataStr);
        } catch {
          data = {};
        }

        onEvent(eventType as SSEEventType, data);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function useSSEStream(): UseSSEStreamReturn {
  const abortRef = useRef<AbortController | null>(null);

  const disconnect = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const connect = useCallback(
    (response: Response, onEvent: SSEHandler, onClose?: () => void) => {
      // 先断开现有连接
      disconnect();

      if (!response.body) {
        console.error('[SSE] Response has no body');
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      parseSSEStream(response.body, onEvent, controller.signal)
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            console.error('[SSE] Stream error:', err);
          }
        })
        .finally(() => {
          if (abortRef.current === controller) {
            abortRef.current = null;
          }
          onClose?.();
        });
    },
    [disconnect],
  );

  return { connect, disconnect };
}
