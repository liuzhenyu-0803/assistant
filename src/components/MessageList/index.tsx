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
 * @lastModified 2025-02-16
 */

import React, { useEffect, useRef } from 'react'
import { Message as MessageType } from '../../types/interfaces'
import { Message } from '../Message'
import './styles.css'

interface MessageListProps {
  messages: MessageType[]
  isReceiving: boolean
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isReceiving }) => {
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
          <p>你好，有什么可以帮你？</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list" ref={listRef}>
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  )
}

export default MessageList
