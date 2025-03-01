/**
 * Message/index.tsx
 * 消息项组件
 */

import React, { useMemo } from 'react'
import { Message as MessageType } from '../../../types'
import MarkdownRenderer from './MarkdownRenderer'
import './styles.css'

interface MessageProps {
  message: MessageType
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const { displayContent, messageType } = useMemo(() => {
    let content = message.content
    let type: string = message.role

    // 处理助手消息状态
    if (message.role === 'assistant') {
      if (message.status === 'waiting') {
        content = '正在思考...'
      } else if (message.status === 'error') {
        type = 'error'
        content = message.content 
          ? `${message.content}\n\n**发生错误** 😢\n\n\`\`\`\n${message.error || '未知错误'}\n\`\`\``
          : `**发生错误** 😢\n\n\`\`\`\n${message.error || '未知错误'}\n\`\`\``
      } else if (message.status === 'aborted') {
        content = message.content 
          ? `${message.content}\n\n**已中断请求** ⚠️`
          : '**已中断请求** ⚠️'
      }
    }

    // 处理函数调用
    if (message.function_call) {
      type = 'function-call'
      content = `正在调用工具: ${message.function_call.name}`
    }
    
    // 处理函数结果
    if (message.role === 'function') {
      type = 'function-result'
      try {
        const resultObject = JSON.parse(message.content)
        content = `**函数执行结果:** \`${message.name}\`\n\n\`\`\`json\n${JSON.stringify(resultObject, null, 2)}\n\`\`\``
      } catch (e) {
        content = `**函数执行结果:** \`${message.name}\`\n\n${message.content}`
      }
    }
    
    return { displayContent: content, messageType: type }
  }, [message])

  const className = `message-item ${messageType} ${message.status === 'error' ? 'error' : ''}`

  return (
    <div className={className}>
      <div className="message-content">
        {typeof displayContent === 'string' ? (
          <MarkdownRenderer content={displayContent} />
        ) : displayContent}
      </div>
    </div>
  )
}

export default React.memo(Message)
