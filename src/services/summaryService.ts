/**
 * 对话摘要服务
 */

import { Message, Summary } from '../types'
import { ChatMessage } from '../types/models/message'
import { APIError } from '../types/services/api'
import { configService } from './configService'
import { getResponse } from './apiService'

class SummaryService {
  private summary: Summary | null = null

  /**
   * 更新对话摘要
   * @param messages 需要生成摘要的消息列表
   * @param signal AbortSignal 用于取消请求
   * @throws Error 当找不到对应的用户消息或 API 调用失败时
   */
  async updateSummary(messages: Message[], signal?: AbortSignal): Promise<void> {
    if (messages.length === 0) {
      console.log('清空摘要：消息列表为空')
      this.summary = null
      return
    }

    // 确保有至少一个用户消息和一个AI回复
    const hasUserMessage = messages.some(msg => msg.role === 'user')
    const hasAIResponse = messages.some(msg => msg.role === 'assistant' && msg.status === 'success')

    if (!hasUserMessage || !hasAIResponse) {
      console.log('消息列表不完整，跳过摘要生成')
      return
    }

    try {
      const content = await this.generateSummary(messages, this.summary?.content || null, signal)
      this.summary = {
        content,
        lastUpdated: Date.now()
      }
      console.log('摘要更新成功:', { length: content.length })
    } catch (error) {
      if (error instanceof APIError && error.isAbort()) {
        console.log('摘要生成被终止')
        return
      }
      console.error('生成摘要失败:', error)
    }
  }

  /**
   * 获取当前摘要
   * @returns 当前摘要，如果没有则返回 null
   */
  getSummary(): Summary | null {
    return this.summary
  }

  /**
   * 清空当前摘要
   */
  clearSummary(): void {
    this.summary = null
  }

  /**
   * 生成或更新摘要
   * @param messages 需要生成摘要的消息列表
   * @param currentSummary 当前摘要内容，如果为 null 则生成新摘要
   * @param signal AbortSignal 用于取消请求
   * @returns 生成的摘要内容
   * @throws Error 当找不到对应的用户消息时
   */
  private async generateSummary(messages: Message[], currentSummary: string | null, signal?: AbortSignal): Promise<string> {
    const aiResponse = messages[messages.length - 1]
    if (aiResponse.role !== 'assistant' || aiResponse.status !== 'success') {
      console.error('生成摘要失败：最后一条消息不是成功的 AI 响应')
      throw new Error('最后一条消息必须是成功的 AI 响应')
    }

    let userMessage = null
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMessage = messages[i]
        break
      }
    }

    if (!userMessage) {
      console.error('生成摘要失败：未找到对应的用户消息')
      throw new Error('没有找到对应的用户消息')
    }

    let systemPrompt = `你是一个对话摘要助手。请遵循以下规则生成新的摘要：

1. 摘要内容：
   - 对话的核心话题和关键结论
   - 重要的信息和观点
   - 达成的共识或决定
   - 用户表达的需求、问题或偏好

2. 摘要原则：
   - 【重要】保留之前摘要中的关键信息，尤其是用户的需求和偏好
   - 【重要】不要仅关注最新对话，要确保早期重要信息不会丢失
   - 保持时间顺序，新内容自然承接旧内容
   - 合并相关话题，但不要删除早期独特的信息点
   - 保留对话的情感和语气特点
   - 总字数不超过1000字

3. 摘要格式：
   - 背景：来自之前摘要的重要上下文
   - 主题：本轮对话的主要内容
   - 要点：所有重要信息（包括历史信息）
   - 后续：未完成的事项或计划
   - 备注：特殊的需求或注意事项

请仔细分析之前的摘要和新的对话，生成一个新的摘要。确保之前摘要中的重要信息和上下文都被保留。`

    const apiMessages: ChatMessage[] = [
      { role: 'system' as const, content: systemPrompt },
    ]

    // 如果有当前摘要，先添加摘要信息
    apiMessages.push({
      role: 'user' as const,
      content: `之前的摘要：${currentSummary}`
    })

    // 添加最新一轮的对话
    apiMessages.push(
      { role: 'user' as const, content: `新的对话: \nuser: ${userMessage.content}\nassistant: ${aiResponse.content}` }
    )

    console.log('开始生成摘要:', { 
      hasCurrentSummary: !!currentSummary,
      messageCount: messages.length,
      apiMessages
    })

    const response = await getResponse({
      messages: apiMessages,
      model: configService.getConfig().apiConfig!.selectedModel,
      stream: false,
      signal
    })

    if (!response) {
      throw new Error('生成摘要失败：未收到有效响应')
    }

    console.log('生成的摘要:', response)

    return response.trim()
  }
}

export const summaryService = new SummaryService()
