/**
 * 消息相关的数据模型定义
 */

import { FunctionCall } from '../services/functions'

/** 基础消息接口 */
export interface BaseMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  name?: string
  function_call?: FunctionCall
}

/** 聊天消息接口 */
export interface ChatMessage extends BaseMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  name?: string
  function_call?: FunctionCall
}

/** API 响应消息 */
export interface APIResponseMessage extends BaseMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp?: number
  name?: string
  function_call?: FunctionCall
}

/** UI 展示消息 */
export interface Message extends BaseMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status: MessageStatus
  error?: string
  function_call?: FunctionCall
  name?: string
}

/** 消息状态类型 */
export type MessageStatus = 'idle' | 'waiting' | 'receiving' | 'success' | 'error' | 'aborted'
