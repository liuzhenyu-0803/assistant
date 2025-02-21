/**
 * messageService.ts
 * 消息服务层
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */


import { Message } from '../types/interfaces'
import { configService } from './configService'
import { APIConfig } from '../types/api'
import { summaryService } from './summaryService'


/**
 * 处理消息发送的完整流程
 * @param content 用户输入的消息内容
 * @param onMessage 消息状态更新的回调函数
 * @param signal 用于取消请求的信号
 * @returns Promise<void>
 */
export const handleMessageSend = async (
  content: string,
  onMessage: (message: Message) => void,
  signal?: AbortSignal
): Promise<void> => {
  const config = configService.getConfig()
  let responseContent = ''

  try {
    await sendMessageToOpenRouter(
      content,
      config.apiConfig!,
      (chunk) => {
        responseContent += chunk
        onMessage({
          id: '', // 这个 ID 会在 App.tsx 中被替换
          timestamp: Date.now(),
          role: 'assistant',
          content: responseContent,
          status: 'receiving'
        })
      },
      signal
    )

    onMessage({
      id: '', // 这个 ID 会在 App.tsx 中被替换
      timestamp: Date.now(),
      role: 'assistant',
      content: responseContent || ' ',
      status: 'success'
    })
  } catch (error) {
    onMessage({
      id: '', // 这个 ID 会在 App.tsx 中被替换
      timestamp: Date.now(),
      role: 'assistant',
      content: responseContent || ' ',
      status: error instanceof Error && error.name === 'AbortError' ? 'aborted' : 'error',
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}


/**
 * 创建新的消息对象
 * @param content 消息内容
 * @param role 消息角色，默认为 'user'
 * @returns Message 新创建的消息对象
 */
export const createMessage = (content: string, role: 'user' | 'assistant' = 'user'): Message => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
  status: 'waiting'
})


/**
 * 向 OpenRouter 发送消息并处理流式响应
 * @param content 用户消息内容
 * @param config API配置信息
 * @param onChunk 处理每个响应片段的回调函数
 * @param signal 用于取消请求的信号
 * @throws Error 当API密钥未设置、模型未选择或请求失败时
 */
const sendMessageToOpenRouter = async (
  content: string, 
  config: APIConfig,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> => {
  if (!config.apiKey) {
    throw new Error('API Key 未设置')
  }

  if (!config.selectedModel) {
    throw new Error('未选择模型')
  }

  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    'Referer': 'https://github.com/liuzhenyu-0803/assistant',
    'x-title': 'AI Assistant'
  }

  const summaries = summaryService.getSummaries()
  const messages = []

  if (summaries.length > 0) {
    messages.push({
      role: 'system',
      content: '以下是按时间顺序排列用户和你的历史对话摘要，较早的在前，较新的在后。请在回答时考虑这些上下文：\n\n' + 
              summaries
                .map((s, index) => `${index + 1}. [${new Date(s.timestamp).toLocaleString()}] ${s.content}`)
                .join('\n')
    })
  }

  messages.push({ role: 'user', content })

  const body = {
    model: config.selectedModel,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000
  }

  let reader: ReadableStreamDefaultReader<Uint8Array>

  try {
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
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
      
      throw new Error(`API 请求失败: ${errorMessage}`)
    }

    if (!response.body) {
      throw new Error('响应体为空')
    }

    reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk
          .split('\n')
          .filter(line => line.trim() !== '')

        for (const line of lines) {
          try {
            if (line.includes('OPENROUTER PROCESSING')) continue
            if (line.trim() === 'data: [DONE]') continue
            
            const jsonStr = line.replace(/^data: /, '').trim()
            if (!jsonStr) continue

            const json = JSON.parse(jsonStr)
            
            if (json.choices && json.choices[0]) {
              const content = json.choices[0].delta?.content || json.choices[0].text || ''
              if (content) {
                onChunk(content)
              }
            }
          } catch (e) {
            console.error('解析响应数据失败:', e)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    throw error
  }
}
