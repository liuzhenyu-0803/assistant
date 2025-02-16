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
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> => {
  let headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // OpenRouter 需要额外的头部
  if (config.provider === 'openrouter') {
    headers = {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/liuzhenyu-0803/assistant',
      'X-Title': 'AI Assistant'
    }
  } else {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const body = {
    model: config.selectedModel || 'openai/gpt-4o',  // 如果没有选择模型，使用默认的GPT-4
    messages: [{ role: 'user', content }],
    stream: true
  }

  console.log('Sending request to OpenRouter:', {
    url: config.provider === 'openrouter'
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions',
    headers,
    body
  })

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
    console.error('API request failed:', {
      status: response.status,
      statusText: response.statusText,
      error
    })
    throw new Error(`API 请求失败: ${response.status} ${error}`)
  }

  if (!response.body) {
    throw new Error('响应体为空')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      console.log('Raw chunk:', chunk)  // 添加原始数据日志
      
      const lines = chunk
        .split('\n')
        .filter(line => line.trim() !== '')

      for (const line of lines) {
        try {
          // 跳过特殊的处理消息
          if (line.includes('OPENROUTER PROCESSING')) continue
          if (line.trim() === 'data: [DONE]') continue
          
          const jsonStr = line.replace(/^data: /, '').trim()
          if (!jsonStr) continue

          // 添加更多的调试信息
          console.log('Processing line:', jsonStr)

          const json = JSON.parse(jsonStr)
          console.log('Parsed JSON:', json)
          
          if (json.choices && json.choices[0]) {
            const content = json.choices[0].delta?.content || json.choices[0].text || ''
            if (content) {
              console.log('Extracted content:', content)
              onChunk(content)
            }
          }
        } catch (e) {
          console.error('解析响应数据失败:', {
            error: e,
            rawLine: line,
            chunk: chunk
          })
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// 发送消息并获取AI响应
export const sendMessage = async (content: string, signal?: AbortSignal): Promise<Message> => {
  // 确保配置已初始化
  await configService.initialize()
  const config = configService.getConfig()
  
  if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
    throw new Error('API 配置不完整，请先完成配置')
  }

  const message = createMessage('', 'assistant')
  message.status = 'receiving'
  let fullContent = ''

  try {
    let retries = 3

    while (retries > 0) {
      try {
        await sendToAPI(
          content, 
          config.apiConfig, 
          (chunk: string) => {
            fullContent += chunk
            message.content = fullContent
            // 每次收到新的内容块都触发更新
            message.timestamp = Date.now()
          },
          signal
        )
        break
      } catch (error) {
        retries--
        if (retries === 0) throw error
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    message.status = 'success'
    return message
  } catch (error) {
    message.status = 'error'
    message.error = error instanceof Error ? error.message : '未知错误'
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
  // 开始接收AI响应
  onStart()

  try {
    const message = await sendMessage(content, signal)
    onMessage(message)
  } catch (error) {
    console.error('发送消息失败:', error)
    throw error
  }
}
