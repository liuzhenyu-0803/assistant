import type { SendMessageRequest, StopResponse } from '@assistant/shared';

const BASE_URL = '/api';

export async function sendMessage(
  conversationId: string,
  request: SendMessageRequest,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal,
  });
  return response;
}

export async function stopRun(conversationId: string): Promise<StopResponse> {
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`停止 Run 失败: ${text}`);
  }

  const json = await response.json();
  return (json as { data: StopResponse }).data;
}
