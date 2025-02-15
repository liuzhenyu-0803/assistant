/**
 * interfaces.ts
 * 类型定义文件
 * 
 * 包含：
 * - Message: 消息对象接口
 *   - id: 唯一标识符
 *   - role: 消息发送者角色(user/assistant)
 *   - content: 消息内容
 *   - timestamp: 发送时间戳
 *   - status: 消息状态(sending/sent/error)
 * - InputAreaProps: 输入区组件属性
 * - MessageListProps: 消息列表组件属性
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  status: 'sending' | 'sent' | 'error'
}

// 输入区属性接口
export interface InputAreaProps {
  onSendMessage: (content: string) => Promise<void>
  onStopReceiving?: () => void
  isReceiving: boolean
  maxLength?: number
}

// 消息列表属性接口
export interface MessageListProps {
  messages: Message[]
}
