/**
 * InputArea/index.tsx
 * 消息输入区组件
 * 
 * 功能：
 * - 文本输入和编辑
 * - 字数限制（默认5000字）
 * - 发送/停止按钮状态管理
 * - 键盘快捷键支持
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import React, { useState } from 'react'
import './styles.css'
import { InputAreaProps } from '../../types/interfaces'
import { cleanText, isEmptyText } from '../../utils/helpers'
import { SendIcon, StopIcon } from '../icons'

export const InputArea: React.FC<InputAreaProps> = ({ 
  onSendMessage, 
  onStopReceiving,
  isReceiving,
  maxLength = 5000 
}) => {
  const [message, setMessage] = useState('')

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setMessage(newValue)
    }
  }

  const handleSend = async () => {
    const cleanedMessage = cleanText(message)
    if (!isEmptyText(cleanedMessage) && !isReceiving) {
      try {
        setMessage('') // 先清空内容
        await onSendMessage(cleanedMessage)
      } catch {
        // 错误处理由父组件负责
      }
    }
  }

  const handleStopReceiving = () => {
    onStopReceiving?.()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isReceiving) {
        handleStopReceiving()
      } else {
        handleSend()
      }
    }
  }

  const charCount = message.length
  const isOverLimit = charCount > maxLength
  const isEmpty = isEmptyText(message)

  // 按钮状态
  const getButtonProps = () => {
    if (isReceiving) {
      return {
        onClick: handleStopReceiving,
        disabled: false,
        title: '停止接收',
        icon: <StopIcon />
      }
    }
    
    if (isEmpty || isOverLimit) {
      return {
        onClick: handleSend,
        disabled: true,
        title: isEmpty ? '请输入消息' : '超出字数限制',
        icon: <SendIcon />
      }
    }

    return {
      onClick: handleSend,
      disabled: false,
      title: '发送',
      icon: <SendIcon />
    }
  }

  const buttonProps = getButtonProps()

  return (
    <div className="input-area">
      <textarea
        className="edit-box"
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder="按 Enter 发送，按 Shift + Enter 换行"
      />
      <div className="toolbar">
        <div className="toolbar-left">
          <span className={`char-count ${isOverLimit ? 'over-limit' : ''}`}>
            {charCount}/{maxLength}
          </span>
        </div>
        <div className="toolbar-right">
          <button
            className={`send-button ${isReceiving ? 'receiving' : ''}`}
            onClick={buttonProps.onClick}
            disabled={buttonProps.disabled}
            title={buttonProps.title}
          >
            {buttonProps.icon}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InputArea
