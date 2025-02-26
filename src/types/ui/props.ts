/**
 * UI 组件属性相关的类型定义
 */

import { Message, MessageStatus } from '../models/message'

/** 输入区属性接口 */
export interface InputAreaProps {
  /** 发送消息的回调函数 */
  onSendMessage: (message: string) => Promise<void>
  /** 终止消息接收的回调函数 */
  onAbort: () => void
  /** 打开设置的回调函数 */
  onOpenSettings: () => void
  /** 清空对话的回调函数 */
  onClearConversation: () => void
  /** 当前聊天状态 */
  status: MessageStatus
  /** 输入框最大长度 */
  maxLength?: number
  /** 是否禁用输入 */
  disabled?: boolean
  /** 输入框占位符文本 */
  placeholder?: string
}

/** 消息列表属性接口 */
export interface MessageListProps {
  /** 消息列表 */
  messages: Message[]
}

/** Markdown渲染器属性接口 */
export interface MarkdownRendererProps {
  /** Markdown内容 */
  content: string
}

/** 代码块属性接口 */
export interface CodeProps {
  /** 代码节点 */
  node?: any
  /** 是否是内联代码 */
  inline?: boolean
  /** 类名 */
  className?: string
  /** 子元素 */
  children?: React.ReactNode
}
