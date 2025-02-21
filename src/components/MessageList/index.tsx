import { useEffect, useRef, useCallback } from 'react'
import { Message as MessageType, MessageListProps } from '../../types'
import { Message } from '../Message'
import './styles.css'

/**
 * MessageList 组件
 * 用于展示对话消息列表，支持自动滚动到底部
 */
export function MessageList({ messages }: MessageListProps) {
  // 用于获取消息列表容器的DOM引用，实现滚动功能
  const listRef = useRef<HTMLDivElement>(null)

  // 滚动到底部的函数，使用 useCallback 优化性能
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      // 将 scrollTop 设置为 scrollHeight 实现滚动到底部
      // 浏览器会自动确保不会超过最大可滚动距离
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [])  // 空依赖数组确保函数只在组件挂载时创建一次

  // 监听 messages 变化，自动滚动到底部
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])  // 在新消息到达时和组件首次渲染完成时触发

  // 处理空消息列表的情况，显示欢迎信息
  if (messages.length === 0) {
    return (
      <div className="message-list empty">
        <p>你好，有什么可以帮你？</p >
      </div>
    )
  }

  // 渲染消息列表，为每条消息创建 Message 组件
  return (
    <div className="message-list" ref={listRef}>
      {messages.map(message => (
        <Message key={message.id} message={message} />
      ))}
    </div>
  )
}

export default MessageList