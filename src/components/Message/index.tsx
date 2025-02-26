/**
 * Message/index.tsx
 * 消息项组件
 */

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Message as MessageType } from '../../types'
import './styles.css'

interface MessageProps {
  message: MessageType
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  let displayContent = message.content

  // 处理不同状态的消息显示
  if (message.role === 'assistant') {
    if (message.status === 'waiting') {
      displayContent = '正在思考...'
    } else if (message.status === 'error') {
      // 显示错误消息并添加样式
      displayContent = `**发生错误** 😢\n\n\`\`\`\n${message.error || '未知错误'}\n\`\`\``
    } else if (message.status === 'aborted') {
      displayContent = '**已中断请求** ⚠️'
    }
  }

  return (
    <div className={`message-item ${message.role} ${message.status === 'error' ? 'error' : ''}`}>
      <div className="message-content">
        {typeof displayContent === 'string' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children }) {
                const match = /language-(\w+)/.exec(className || '')
                return match ? (
                  <SyntaxHighlighter
                    style={dracula}
                    language={match[1]}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {displayContent}
          </ReactMarkdown>
        ) : displayContent}
      </div>
    </div>
  )
}

export default Message
