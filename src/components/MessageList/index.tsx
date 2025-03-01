/**
 * 消息列表
 * 
 * 功能：展示对话记录、自动滚动至最新消息
 */

import React, { useEffect, useRef } from 'react'
import { MessageListProps } from '../../types'
import { Message } from './Message'
import './styles.css'

/**
 * 消息列表组件
 */
export function MessageList({ messages }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // 当消息更新时自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  // 空消息状态展示欢迎提示
  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <p>你好，有什么可以帮你？</p>
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

export default React.memo(MessageList)