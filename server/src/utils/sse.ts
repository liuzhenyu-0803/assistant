import type { Response } from 'express';
import type { SSEEventType } from '@assistant/shared';

/**
 * 设置 SSE 响应头
 */
export function setupSSEResponse(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

/**
 * 格式化并发送单个 SSE 事件
 */
export function sendSSEEvent(res: Response, event: SSEEventType, data: unknown): void {
  const payload = JSON.stringify(data);
  res.write(`event: ${event}\ndata: ${payload}\n\n`);
}

/**
 * 启动 15 秒心跳定时器，返回清理函数
 */
export function startPingInterval(res: Response): () => void {
  const PING_INTERVAL_MS = 15_000;
  const interval = setInterval(() => {
    res.write('event: ping\ndata: {}\n\n');
  }, PING_INTERVAL_MS);

  return () => clearInterval(interval);
}
