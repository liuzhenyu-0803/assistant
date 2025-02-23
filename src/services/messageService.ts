/**
 * 消息服务实现
 * 负责处理消息发送、状态管理和流式响应
 */

import { Message, ChatMessage } from '../types'
import { configService } from './configService'
import { getResponse } from './apiService'
import { APIError } from '../types/services/api'
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
  onMessage: (update: { content: string, status: Message['status'], error?: string }) => void,
  signal?: AbortSignal
): Promise<void> => {
  let responseContent = ''

  try {
    const messages: ChatMessage[] = []

    const currentSummary = summaryService.getSummary()
    if (currentSummary) {
      messages.push({
        role: 'system' as const,
        content: '以下是之前对话的摘要，请在回答时考虑这些上下文：\n\n' + 
                `${currentSummary.content}`
      })
    }

    messages.push({ role: 'user' as const, content })

    // 打印messages
    console.log('发送的消息列表:', messages)

    await getResponse({
      messages,
      model: configService.getConfig().apiConfig!.selectedModel,
      stream: true,
      onChunk: (chunk, done) => {
        responseContent += chunk

        if (done)
        {
          console.log('API 流式响应:', responseContent)

          if (!responseContent) {
            throw new Error('无响应内容')
          }
        }

        onMessage({
          content: responseContent,
          status: done ? 'success' : 'receiving'
        })
      },
      signal
    })
  } catch (error) {
    onMessage({
      content: responseContent,
      status: error instanceof APIError && error.isAbort() ? 'aborted' : 'error',
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
