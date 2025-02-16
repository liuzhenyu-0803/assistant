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
import { SendIcon, StopIcon, SettingsIcon } from '../icons'

export const InputArea: React.FC<InputAreaProps> = ({ 
  onSend, 
  onAbort,
  onSettingsClick,
  isReceiving,
  maxLength = 5000,
  disabled = false,
  placeholder = '输入消息...'
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
    if (!isEmptyText(cleanedMessage) && !isReceiving && !disabled) {
      try {
        setMessage('') // 先清空内容
        await onSend(cleanedMessage)
      } catch {
        // 错误处理由父组件负责
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOverLimit = message.length > maxLength

  return (
    <div className="input-area">
      <textarea
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        className="edit-box"
      />
      <div className="toolbar">
        <div className="toolbar-left">
          <span className={`char-count ${isOverLimit ? 'over-limit' : ''}`}>
            {message.length}/{maxLength}
          </span>
        </div>
        <div className="toolbar-right">
          <button 
            className="icon-button"
            onClick={onSettingsClick}
            title="设置"
          >
            <SettingsIcon />
          </button>
          {isReceiving ? (
            <button 
              className="icon-button"
              onClick={onAbort}
              title="停止生成"
            >
              <StopIcon />
            </button>
          ) : (
            <button 
              className="icon-button"
              onClick={handleSend}
              disabled={isEmptyText(cleanText(message)) || disabled}
              title="发送消息"
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default InputArea
