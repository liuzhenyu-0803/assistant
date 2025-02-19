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
import { configService } from './configService'
import { APIConfig } from '../types/api'
import { summaryService } from './summaryService' // 引入summaryService

// 创建新消息
export const createMessage = (content: string, role: 'user' | 'assistant' = 'user'): Message => ({
  id: crypto.randomUUID(),
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
  // 验证配置
  if (!config.apiKey) {
    throw new Error('API Key 未设置')
  }
  if (!config.selectedModel) {
    throw new Error('未选择模型')
  }

  console.log('发送请求的完整配置:', {
    provider: config.provider,
    model: config.selectedModel,
    apiKey: config.apiKey,
    content: content
  })

  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`
  }

  // OpenRouter 需要额外的头部
  if (config.provider === 'openrouter') {
    headers['Referer'] = 'https://github.com/liuzhenyu-0803/assistant'
    headers['x-title'] = 'AI Assistant'
  }

  const summaries = summaryService.getSummaries()
  const messages = []

  // 如果有历史摘要，添加系统消息
  if (summaries.length > 0) {
    const systemMessage = {
      role: 'system',
      content: '以下是按时间顺序排列用户和你的历史对话摘要，较早的在前，较新的在后。请在回答时考虑这些上下文：\n\n' + 
              summaries
                .map((s, index) => `${index + 1}. [${new Date(s.timestamp).toLocaleString()}] ${s.content}`)
                .join('\n')
    }
    messages.push(systemMessage)
    console.log('添加系统消息:', systemMessage)
  } else {
    console.log('没有历史摘要')
  }

  // 添加用户当前消息
  messages.push({ role: 'user', content })

  const body = {
    model: config.selectedModel,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000
  }

  console.log('发送请求的详细信息:', {
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
    const errorText = await response.text()
    let errorMessage: string
    
    try {
      const errorJson = JSON.parse(errorText)
      errorMessage = errorJson.error?.message || errorText
    } catch {
      errorMessage = errorText
    }
    
    console.error('API 请求失败:', {
      status: response.status,
      statusText: response.statusText,
      error: errorMessage
    })
    
    throw new Error(`API 请求失败: ${errorMessage}`)
  }

  if (!response.body) {
    throw new Error('响应体为空')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log('Stream完成')
        break
      }

      const chunk = decoder.decode(value)
      console.log('Raw chunk:', chunk)  // 添加原始数据日志
      
      const lines = chunk
        .split('\n')
        .filter(line => line.trim() !== '')

      for (const line of lines) {
        try {
          // 跳过特殊的处理消息
          if (line.includes('OPENROUTER PROCESSING')) {
            console.log('跳过处理消息:', line)
            continue
          }
          if (line.trim() === 'data: [DONE]') {
            console.log('收到完成标记')
            continue
          }
          
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
    console.log('Stream结束，释放reader')
    reader.releaseLock()
  }
}

// 发送消息并获取AI响应
export const sendMessage = async (
  content: string,
  onUpdate: (message: Message) => void,
  signal?: AbortSignal
): Promise<Message> => {
  // 确保配置已初始化
  await configService.initialize()
  const config = configService.getConfig()
  
  if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
    console.error('配置不完整:', config.apiConfig)
    throw new Error('API 配置不完整，请先完成配置')
  }

  const message = createMessage('', 'assistant')
  console.log('创建新消息:', message)
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
            message.timestamp = Date.now()
            message.status = 'receiving'
            onUpdate({ ...message })
          },
          signal
        )
        
        message.status = 'success'
        onUpdate({ ...message })
        break
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          message.status = 'aborted'
          message.content = fullContent || '消息生成已终止'
          onUpdate({ ...message })
          return message
        }
        
        retries--
        if (retries === 0) {
          message.status = 'error'
          message.error = '发送消息失败'
          onUpdate({ ...message })
          return message
        }
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return message
  } catch (error) {
    message.status = 'error'
    message.error = error instanceof Error ? error.message : '未知错误'
    onUpdate({ ...message })
    throw error
  }
}

// 处理消息发送流程
export const handleMessageSend = async (
  content: string,
  onMessage: (message: Message) => void,
  signal?: AbortSignal
): Promise<void> => {
  await sendMessage(
    content,
    (message) => {
      if (message.status === 'error') {
        throw new Error(message.error || '消息发送失败')
      }
      onMessage(message)
    },
    signal
  )
}
