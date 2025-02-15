/**
 * MessageList/index.tsx
 * 消息列表组件
 * 
 * 功能：
 * - 展示消息历史
 * - 空列表提示
 * - 自动滚动
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import React, { useEffect, useRef } from 'react'
import { Message } from '../../types/interfaces'
import './styles.css'

interface MessageListProps {
  messages: Message[]
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const listRef = useRef<HTMLDivElement>(null)

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-message">
          <p>你好！我是AI助手，请告诉我你的问题。</p>
          <p>我会尽我所能帮助你。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map(message => (
        <div key={message.id} className={`message-item ${message.role} ${message.status === 'error' ? 'error' : ''}`}>
          <div className="message-content">
            {message.content}
          </div>
          <div className="message-time">
            {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default MessageList
