/**
 * 消息相关的数据模型定义
 * 
 * 包含聊天系统中所有消息相关的数据结构：
 * - 消息角色和状态的类型定义
 * - 基础消息结构
 * - API通信的消息格式
 * - UI展示的消息格式
 * 
 * @module types/services/message
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { FunctionCall } from './functions'

/**
 * 消息角色类型
 * 定义消息的发送者身份
 * 
 * - user: 用户发送的消息
 * - assistant: AI助手发送的消息
 * - system: 系统消息，通常用于设置上下文或提供指令
 */
export type MessageRole = 'user' | 'assistant' | 'system'

/**
 * 消息状态类型
 * 表示消息处理的不同阶段
 * 
 * - idle: 空闲状态
 * - waiting: 等待处理
 * - receiving: 正在接收/生成
 * - success: 处理成功
 * - error: 处理出错
 * - aborted: 已中止处理
 */
export type MessageStatus = 'idle' | 'waiting' | 'receiving' | 'success' | 'error' | 'aborted'

/**
 * 基础消息接口
 * 定义所有消息类型的共同属性
 */
export interface BaseMessage {
  /** 消息发送者的角色 */
  role: MessageRole
  
  /** 消息的文本内容 */
  content: string
  
  /** 发送者的名称（可选） */
  name?: string
  
  /** 函数调用数据（用于工具调用） */
  functionCall?: FunctionCall
}

/**
 * 聊天消息接口
 * 与API通信时使用的消息格式
 * （与基础消息相同，为了代码语义清晰保留此类型）
 */
export type ChatMessage = BaseMessage

/**
 * UI展示消息接口
 * 用于前端界面显示的消息格式，扩展了基础消息
 */
export interface Message extends BaseMessage {
  /** 消息的唯一标识符 */
  id: string
  
  /** 消息角色（在UI中只显示用户和助手消息） */
  role: 'user' | 'assistant'
  
  /** 消息创建的时间戳 */
  timestamp: number
  
  /** 消息的处理状态 */
  status: MessageStatus
  
  /** 错误信息（如果存在） */
  error?: string
}
