/**
 * 消息项组件
 * 
 * 功能: 展示单条消息内容，支持不同角色和状态显示
 * 
 * @lastModified 2025-03-01
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

    // 处理消息的不同状态和内容
    if (message.role === 'assistant') {
      // 1. 处理函数调用 - 优先级最高
      if (message.function_call) {
        styleType = 'function-call'
        content = `正在调用工具: ${message.function_call.name}`
      } 
      // 2. 处理消息状态
      else {
        switch (message.status) {
          case 'waiting':
            styleType = 'waiting'
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
            styleType = 'aborted'
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
    
    return { formattedContent: content, messageStyleType: styleType }
  }, [message])

  // 构建最终的className，优化类名结构
  const className = `message-item ${messageStyleType} ${message.status}`

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
