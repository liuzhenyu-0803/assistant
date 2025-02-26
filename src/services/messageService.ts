/**
 * 消息服务实现
 * 负责处理消息发送、状态管理和流式响应
 */

import { Message, ChatMessage } from '../types'
import { configService } from './configService'
import { getResponse } from './apiService'
import { APIError } from '../types/services/api'

/**
 * 处理消息发送的完整流程
 * @param messages 历史消息列表，已包含当前用户消息
 * @param onMessage 消息状态更新的回调函数
 * @param signal 用于取消请求的信号
 * @returns Promise<void>
 */
export const handleMessageSend = async (
  messages: Message[],
  onMessage: (update: { content: string, status: Message['status'], error?: string }) => void,
  signal?: AbortSignal
): Promise<void> => {
  let responseContent = ''

  try {
    const contextMessages: ChatMessage[] = []

    // 使用最近的20条消息作为上下文（已包含当前用户消息）
    const recentMessages = messages.slice(-20)
    
    // 将最近的消息转换为API所需的格式
    recentMessages.forEach(msg => {
      contextMessages.push({
        role: msg.role,
        content: msg.content
      })
    })

    // 不再重复添加当前用户消息，因为messages中已经包含了
    // 打印消息列表
    console.log('发送的消息列表:', contextMessages)

    const config = configService.getConfig()
    await getResponse({
      messages: contextMessages,
      model: config.apiConfig!.selectedModels[config.apiConfig!.provider],
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
