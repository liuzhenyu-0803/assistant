/**
 * zhipuService.ts
 * 智谱 AI 服务实现文件
 */

import { ChatMessage } from '../types/models/message'

const API_KEY = "b67760b243fe8910a581ca331de1c20d.CepE0J2dlLkxNDmF"
const API_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

interface ZhipuChatParams {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

/**
 * 获取智谱 AI 响应
 */
export async function getResponse({
  messages,
  temperature = 0.7,
  maxTokens = 2000,
  signal
}: ZhipuChatParams): Promise<string | null> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "glm-4",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature,
        max_tokens: maxTokens
      }),
      signal
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('请求被中止');
      return null;
    }
    console.error('智谱 AI API 调用失败:', error);
    throw error;
  }
}
