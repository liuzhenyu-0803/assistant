/**
 * messageService.ts
 * 消息服务层
 * 
 * 功能：
 * - 创建和管理消息对象
 * - 模拟AI响应的流式传输
 * - 处理消息发送的完整流程
 * - 统一的错误处理机制
 * 
 * 主要函数：
 * - createMessage: 创建新的消息对象
 * - streamResponse: 模拟流式响应
 * - sendMessage: 发送消息并获取AI响应
 * - handleMessageSend: 处理完整的消息发送流程
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import { Message } from '../types/interfaces'
import { generateId } from '../utils/helpers'
import { configService } from './configService'
import { APIConfig } from '../types/api'

// 创建新消息
export const createMessage = (content: string, role: 'user' | 'assistant' = 'user'): Message => ({
  id: generateId(),
  role,
  content,
  timestamp: Date.now(),
  status: 'sending'
})

// 发送消息到 API
const sendToAPI = async (
  content: string, 
  config: APIConfig,
  signal?: AbortSignal
): Promise<string> => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json'
  }

  // OpenRouter 需要额外的头部
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin
    headers['X-Title'] = 'AI Assistant'
  }

  const body = {
    model: config.selectedModel,
    messages: [{ role: 'user', content }],
    stream: true
  }

  const response = await fetch(
    config.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`API 请求失败: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// 发送消息并获取AI响应
export const sendMessage = async (content: string, signal?: AbortSignal): Promise<Message> => {
  const config = configService.getConfig()
  
  if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
    throw new Error('API 配置不完整，请先完成配置')
  }

  try {
    let response: string
    let retries = 3

    while (retries > 0) {
      try {
        response = await sendToAPI(content, config.apiConfig, signal)
        break
      } catch (error) {
        retries--
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return {
      id: generateId(),
      role: 'assistant',
      content: response!,
      timestamp: Date.now(),
      status: 'sent'
    }
  } catch (error) {
    if (signal?.aborted) {
      return {
        id: generateId(),
        role: 'assistant',
        content: '回答被中止',
        timestamp: Date.now(),
        status: 'sent'
      }
    }

    // 其他错误，抛出给上层处理
    throw error
  }
}

// 处理消息发送流程
export const handleMessageSend = async (
  content: string,
  onStart: () => void,
  onMessage: (message: Message) => void,
  signal?: AbortSignal
): Promise<void> => {
  // 创建用户消息
  const userMessage = createMessage(content, 'user')
  // 创建临时的AI响应消息
  const tempAiMessage = createMessage('正在思考中...', 'assistant')
  
  try {
    onStart()
    // 立即显示用户消息和临时AI消息
    onMessage({ ...userMessage, status: 'sent' })
    onMessage({ ...tempAiMessage, status: 'sending' })
    
    // 等待AI响应
    const aiResponse = await sendMessage(content, signal)
    // 更新AI响应消息
    onMessage({ ...aiResponse, id: tempAiMessage.id, status: 'sent' })
  } catch (error) {
    if (!signal?.aborted) {
      // 显示错误消息
      onMessage({ 
        ...tempAiMessage, 
        content: error instanceof Error ? error.message : '发送消息时出错',
        status: 'error'
      })
    }
  }
}
