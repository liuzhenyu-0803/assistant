/**
 * InputArea/index.tsx
 * 消息输入区组件
 * 
 * 功能：
 * 1. 文本输入和编辑
 *    - 支持多行文本输入
 *    - 实时字数统计和限制
 *    - 文本清理和验证
 * 
 * 2. 快捷键支持
 *    - Enter: 发送消息
 *    - Shift + Enter: 换行
 * 
 * 3. 工具栏功能
 *    - 字数统计显示
 *    - 设置按钮
 *    - 清空会话按钮
 *    - 发送/停止按钮（根据状态切换）
 * 
 * 4. 状态管理
 *    - 消息接收状态
 *    - 输入框禁用状态
 *    - 字数超限状态
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-26
 */

import React, { useState, useRef } from 'react'
import { InputAreaProps } from '../../types'
import { cleanText, isEmptyText } from '../../utils/helpers'
import Icon from '../Icon'
import './styles.css'

/**
 * 输入区组件
 * @param {Function} onSendMessage - 发送消息的回调函数
 * @param {Function} onAbort - 中止消息接收的回调函数
 * @param {Function} onOpenSettings - 打开设置面板的回调函数
 * @param {Function} onClearConversation - 清空所有消息的回调函数
 * @param {string} status - 当前聊天状态
 * @param {number} maxLength - 输入框最大字符数
 * @param {boolean} disabled - 是否禁用输入框
 * @param {string} placeholder - 输入框占位符文本
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

  // 输入框内容状态
  const [message, setMessage] = useState<string>('')
  
  // 输入框引用，用于获取焦点
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 处理消息变更，更新输入框内容状态
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - 变更事件
   */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
  }

  /**
   * 处理消息发送
   * 清理文本，验证非空，调用回调函数，清空输入框
   */
  const handleSend = async () => {
    // 如果正在接收消息，则不允许发送新消息
    if (status === 'receiving' || status === 'waiting') return
    
    // 清理文本（去除多余空格等）
    const cleanedMessage = cleanText(message)
    
    // 验证消息非空
    if (!isEmptyText(cleanedMessage)) {
      try {
        // 清空输入框
        setMessage('')
        
        // 调用发送回调
        await onSendMessage(cleanedMessage)
        
        // 恢复输入框焦点
        inputRef.current?.focus()
      } catch {
        // 错误处理由父组件负责，保持组件职责单一
      }
    }
  }

  /**
   * 处理键盘事件
   * - Enter: 发送消息
   * - Shift + Enter: 换行（默认行为）
   * @param {React.KeyboardEvent<HTMLTextAreaElement>} e - 键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 检查是否超出字数限制
  const isOverLimit = message.length > maxLength
  
  // 是否正在接收或等待响应
  const isReceiving = status === 'receiving' || status === 'waiting'

  return (
    <div className="input-area">
      {/* 文本输入区域 */}
      <textarea
        ref={inputRef}
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder={status === 'waiting' ? '正在等待 AI 响应...' : placeholder}
        rows={3}
        className={`edit-box ${isOverLimit ? 'over-length' : ''}`}
      />
      {/* 工具栏 */}
      <div className="toolbar">
        {/* 左侧工具栏：字数统计 */}
        <div className="toolbar-left">
          <span className={`char-count ${isOverLimit ? 'over-limit' : ''}`}>
            {message.length}/{maxLength}
          </span>
        </div>
        {/* 右侧工具栏：功能按钮 */}
        <div className="toolbar-right">
          {/* 设置按钮 */}
          <button 
            className="icon-button"
            onClick={onOpenSettings}
            title="设置"
          >
            <Icon type="settings" />
          </button>
          {/* 清空会话按钮 */}
          <button 
            className="icon-button"
            onClick={onClearConversation}
            title="清空会话"
          >
            <Icon type="clear" />
          </button>
          {/* 发送/停止按钮 */}
          <button
            className={`icon-button ${isReceiving ? 'stop-button' : 'send-button'}`}
            onClick={isReceiving ? onAbort : handleSend}
            disabled={message.trim().length === 0 && !isReceiving}
            title={isReceiving ? '停止接收' : '发送消息'}
          >
            <Icon type={isReceiving ? 'stop' : 'send'} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default InputArea
