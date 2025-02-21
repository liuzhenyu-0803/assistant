/**
 * 消息相关的数据模型定义
 */

/** 基础消息接口 */
export interface BaseMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** 聊天消息接口 */
export interface ChatMessage extends BaseMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** API 响应消息 */
export interface APIResponseMessage extends BaseMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp?: number
}

/** UI 展示消息 */
export interface Message extends BaseMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status: MessageStatus
  error?: string
}

/** 消息状态类型 */
export type MessageStatus = 'idle' | 'waiting' | 'receiving' | 'success' | 'error' | 'aborted'
