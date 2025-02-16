/**
 * summaryService.ts
 * 消息摘要服务
 * 
 * 功能：
 * - 生成对话摘要
 * - 管理历史摘要
 * - 维护最近的摘要列表
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-16
 */

import { Message } from '../types/interfaces'
import { configService } from './configService'

// 最大保留的摘要数量
const MAX_SUMMARIES = 20

// 摘要对象接口
export interface ConversationSummary {
  id: string
  content: string
  timestamp: number
}

class SummaryService {
  private summaries: ConversationSummary[] = []

  // 生成当前对话的摘要
  private async generateSummary(messages: Message[]): Promise<string> {
    console.log('开始生成摘要，当前消息数:', messages.length)
    const config = configService.getConfig()
    if (!config.apiConfig?.apiKey || !config.apiConfig?.selectedModel) {
      throw new Error('API 配置不完整')
    }

    // 将对话转换为文本
    const conversationText = messages
      .map(msg => `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`)
      .join('\n')

    console.log('对话文本:', conversationText)

    // 调用API生成摘要
    const response = await fetch(
      config.apiConfig.provider === 'openrouter'
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiConfig.apiKey}`,
          ...(config.apiConfig.provider === 'openrouter' && {
            'HTTP-Referer': 'https://github.com/liuzhenyu-0803/assistant',
            'X-Title': 'AI Assistant'
          })
        },
        body: JSON.stringify({
          model: config.apiConfig.selectedModel,
          messages: [{
            role: 'system',
            content: '你是一个对话摘要助手。请将下面的对话总结为100字以内的摘要，保留关键信息和重要结论。'
          }, {
            role: 'user',
            content: conversationText
          }],
          max_tokens: 200,
          temperature: 0.7
        })
      }
    )

    if (!response.ok) {
      const error = await response.text()
      console.error('生成摘要失败:', error)
      throw new Error('生成摘要失败')
    }

    const result = await response.json()
    const summary = result.choices[0].message.content.trim()
    console.log('生成的摘要:', summary)
    return summary
  }

  // 添加新的摘要
  async addSummary(messages: Message[]): Promise<void> {
    // 确保有至少一个用户消息和一个AI回复
    const hasUserMessage = messages.some(msg => msg.role === 'user')
    const hasAIMessage = messages.some(msg => msg.role === 'assistant' && msg.content.trim() !== '')
    
    if (!hasUserMessage || !hasAIMessage) {
      console.log('跳过摘要生成：需要至少一个用户消息和一个AI回复')
      return
    }

    console.log('开始添加摘要，当前摘要数:', this.summaries.length)

    try {
      const summary = await this.generateSummary(messages)
      
      this.summaries.push({
        id: `summary-${Date.now()}`,
        content: summary,
        timestamp: Date.now()
      })

      // 保持最近的N条摘要
      if (this.summaries.length > MAX_SUMMARIES) {
        this.summaries = this.summaries.slice(-MAX_SUMMARIES)
      }
      console.log('摘要添加成功，当前摘要数:', this.summaries.length)
    } catch (error) {
      console.error('添加摘要失败:', error)
    }
  }

  // 获取所有摘要
  getSummaries(): ConversationSummary[] {
    console.log('获取摘要，当前摘要数:', this.summaries.length)
    return [...this.summaries]
  }

  // 清空所有摘要
  clearSummaries(): void {
    console.log('清空所有摘要')
    this.summaries = []
  }
}

// 导出单例实例
export const summaryService = new SummaryService()
