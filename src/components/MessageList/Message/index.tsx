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

export function Message({ message }: MessageProps) {
  const { formattedContent, messageStyleType } = useMemo(() => {
    let content = message.content
    let styleType: string = message.role

    // 处理assistant消息的不同情况
    if (message.role === 'assistant') {
      // 处理函数调用优先级高于其他状态
      if (message.function_call) {
        styleType = 'function-call'
        content = `正在调用工具: ${message.function_call.name}`
      } else {
        // 处理不同消息状态
        switch (message.status) {
          case 'waiting':
            content = '正在思考...'
            break
          case 'receiving':
            styleType = 'receiving'
            break
          case 'error':
            styleType = 'error'
            content = `${content || ''}\n\n**发生错误** 😢\n\n\`\`\`\n${message.error || '未知错误'}\n\`\`\``.trim()
            break
          case 'aborted':
            content = `${content || ''}\n\n**已中断请求** ⚠️`.trim()
            break
          case 'success':
            // 如果内容为空，显示提示信息
            if (!content || content.trim() === '') {
              content = '*助手没有返回任何内容* 🤔'
            }
            break
        }
      }
    }
    
    // 确保用户消息也不为空
    if (message.role === 'user' && (!content || content.trim() === '')) {
      content = '*空消息*'
    }
    
    return { formattedContent: content, messageStyleType: styleType }
  }, [message])

  // 构建最终的className
  const className = `message-item ${messageStyleType} ${message.status === 'error' ? 'error' : ''}`

  return (
    <div className={className}>
      <div className="message-content">
        {typeof formattedContent === 'string' ? (
          <MarkdownRenderer content={formattedContent} />
        ) : formattedContent}
      </div>
    </div>
  )
}

export default React.memo(Message)
