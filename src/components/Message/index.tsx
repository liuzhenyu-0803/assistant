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
      // 保留已有内容，并附加错误提示
      const errorMessage = message.error || '未知错误'
      if (message.content) {
        // 有内容时，在内容后添加错误提示
        displayContent = `${message.content}\n\n**发生错误** 😢\n\n\`\`\`\n${errorMessage}\n\`\`\``
      } else {
        // 无内容时，只显示错误信息
        displayContent = `**发生错误** 😢\n\n\`\`\`\n${errorMessage}\n\`\`\``
      }
    } else if (message.status === 'aborted') {
      // 保留已有内容，并附加中断提示
      if (message.content) {
        // 有内容时，在内容后添加中断提示
        displayContent = `${message.content}\n\n**已中断请求** ⚠️`
      } else {
        // 无内容时，只显示中断提示
        displayContent = '**已中断请求** ⚠️'
      }
    }
  }

  // 显示函数调用信息
  // 注意：工具调用现在以普通文本格式显示，不再使用function_call对象
  // 以下代码保留以兼容历史消息
  if (message.function_call) {
    // 生成函数调用的简洁展示
    const functionContent = `正在调用工具: ${message.function_call.name}`;
    
    return (
      <div className={`message-item ${message.role} function-call`}>
        <div className="message-content">
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
            {functionContent}
          </ReactMarkdown>
        </div>
      </div>
    )
  }

  // 显示函数执行结果
  if (message.role === 'function') {
    // 尝试解析 JSON 结果以美化显示
    try {
      const resultObject = JSON.parse(message.content)
      const resultContent = `**函数执行结果:** \`${message.name}\`\n\n\`\`\`json\n${JSON.stringify(resultObject, null, 2)}\n\`\`\``
      
      return (
        <div className="message-item function-result">
          <div className="message-content">
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
              {resultContent}
            </ReactMarkdown>
          </div>
        </div>
      )
    } catch (e) {
      // 如果不是有效的 JSON，直接显示内容
      displayContent = `**函数执行结果:** \`${message.name}\`\n\n${message.content}`
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
