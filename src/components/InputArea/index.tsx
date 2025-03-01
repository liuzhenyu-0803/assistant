/**
 * 用户输入区
 * 
 * 功能：文本输入、快捷键响应、发送控制
 */

import React, { useState, useRef } from 'react'
import { InputAreaProps } from '../../types'
import { cleanText, isEmptyText } from '../../utils/helpers'
import './styles.css'

// SVG图标导入
import sendIcon from '../../assets/icons/send.svg'
import stopIcon from '../../assets/icons/stop.svg'
import settingsIcon from '../../assets/icons/settings.svg'
import clearIcon from '../../assets/icons/clear.svg'

/**
 * 输入区组件
 */
export function InputArea({
  onSendMessage,
  onAbort,
  onOpenSettings,
  onClearConversation,
  status,
  maxLength = 4000,
  disabled = false,
  placeholder = '输入消息，Shift+Enter换行, Enter发送...'
}: InputAreaProps) {

  const [message, setMessage] = useState<string>('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 状态计算
  const isReceiving = status === 'receiving' || status === 'waiting'
  const isOverLimit = message.length > maxLength
  const hasContent = !isEmptyText(message.trim())
  const canSend = hasContent && !isReceiving && !isOverLimit

  // 输入框内容变更
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }

  // 恢复输入框焦点
  const focusInput = () => {
    inputRef.current?.focus()
  }

  // 处理消息发送
  const handleSend = async () => {
    if (!canSend) return
    
    const cleanedMessage = cleanText(message)
    
    try {
      setMessage('')
      await onSendMessage(cleanedMessage)
    } catch (error) {
      console.error('消息发送失败:', error)
      setMessage(cleanedMessage)
    } finally {
      focusInput()
    }
  }

  // 处理键盘事件 (Enter: 发送, Shift+Enter: 换行)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const currentPlaceholder = isReceiving ? '正在等待 AI 响应...' : placeholder

  return (
    <div className="input-area">
      {/* 文本输入区域 */}
      <textarea
        ref={inputRef}
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder={currentPlaceholder}
        rows={3}
        className={`edit-box ${isOverLimit ? 'over-length' : ''}`}
        disabled={disabled || isReceiving}
      />
      {/* 工具栏 */}
      <div className="toolbar">
        {/* 字数统计 */}
        <div className="toolbar-left">
          <span className={`char-count ${isOverLimit ? 'over-limit' : ''}`}>
            {message.length}/{maxLength}
          </span>
        </div>
        {/* 功能按钮 */}
        <div className="toolbar-right">
          <button 
            className="icon-button"
            onClick={onOpenSettings}
            title="设置"
          >
            <img src={settingsIcon} className="icon" alt="设置" />
          </button>
          <button 
            className="icon-button"
            onClick={onClearConversation}
            title="清空会话"
          >
            <img src={clearIcon} className="icon" alt="清空" />
          </button>
          <button
            className={`icon-button ${isReceiving ? 'stop-button' : 'send-button'}`}
            onClick={isReceiving ? onAbort : handleSend}
            disabled={isReceiving ? false : !canSend}
            title={isReceiving ? '停止接收' : '发送消息'}
          >
            <img 
              src={isReceiving ? stopIcon : sendIcon} 
              className="icon" 
              alt={isReceiving ? '停止' : '发送'} 
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default InputArea
