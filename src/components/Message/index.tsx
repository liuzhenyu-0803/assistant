/**
 * Message/index.tsx
 * 消息项组件
 * 
 * 功能：
 * - 展示单条消息内容
 * - 区分用户和AI消息样式
 * - 显示发送时间
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-16
 */

import React from 'react'
import { Message as MessageType } from '../../types/interfaces'
import './styles.css'

interface MessageProps {
  message: MessageType
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  return (
    <div className={`message-item ${message.role}`}>
      <div className="message-content">
        {message.content}
      </div>
      <div className="message-time">
        {new Date(message.timestamp).toLocaleTimeString()}
      </div>
    </div>
  )
}

export default Message
