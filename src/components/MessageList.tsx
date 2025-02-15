import React from 'react'
import ReactMarkdown from 'react-markdown'
import './MessageList/styles.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface Props {
  messages: Message[]
}

const WELCOME_MESSAGE = `👋 你好！我是你的AI助手，让我们开始对话吧。`

const MessageList: React.FC<Props> = ({ messages }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="message assistant empty-message">
          <div className="message-content">
            <ReactMarkdown>{WELCOME_MESSAGE}</ReactMarkdown>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="message-list">
      {messages.map(message => (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="message-content">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          <div className="message-timestamp">{formatTime(message.timestamp)}</div>
        </div>
      ))}
    </div>
  )
}

export default MessageList
