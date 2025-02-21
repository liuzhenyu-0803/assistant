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
  const content = message.role === 'assistant' && message.status === 'waiting' 
    ? '正在思考...' 
    : message.content

  return (
    <div className={`message-item ${message.role}`}>
      <div className="message-content">
        {typeof content === 'string' ? (
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
            {content}
          </ReactMarkdown>
        ) : content}
      </div>
    </div>
  )
}

export default Message
