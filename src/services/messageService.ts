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

// 创建新消息
export const createMessage = (content: string, role: 'user' | 'assistant' = 'user'): Message => ({
  id: generateId(),
  role,
  content,
  timestamp: Date.now(),
  status: 'sending'
})

// 模拟流式响应
const streamResponse = async (signal?: AbortSignal): Promise<string> => {
  const responses = [
    '让我思考一下...',
    '我明白你的问题了...',
    '根据我的分析...',
    '这是完整的回答。'
  ]
  
  let result = ''
  for (const part of responses) {
    if (signal?.aborted) {
      throw new Error('用户取消了接收')
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
    result = part
  }
  return result
}

// 发送消息并获取AI响应
export const sendMessage = async (content: string, signal?: AbortSignal): Promise<Message> => {
  try {
    const response = await streamResponse(signal)
    return {
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
      status: 'sent'
    }
  } catch (error) {
    if (error instanceof Error && error.message === '用户取消了接收') {
      return {
        id: generateId(),
        role: 'assistant',
        content: '回答被中止',
        timestamp: Date.now(),
        status: 'sent'
      }
    }
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
      onMessage({ ...tempAiMessage, status: 'error', content: '抱歉，处理您的消息时出现错误' })
    }
    console.error('发送消息失败:', error)
  }
}
