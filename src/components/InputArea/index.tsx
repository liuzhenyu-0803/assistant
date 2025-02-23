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
 * @lastModified 2025-02-19
 */

import React, { useState, useRef } from 'react'
import { InputAreaProps } from '../../types'
import { cleanText, isEmptyText } from '../../utils/helpers'
import { SendIcon, StopIcon, SettingsIcon, ClearIcon } from '../icons'
import './styles.css'

/**
 * 输入区组件
 * @param {Function} onSendMessage - 发送消息的回调函数
 * @param {Function} onAbortMessageReceiving - 中止消息接收的回调函数
 * @param {Function} onOpenSettings - 打开设置面板的回调函数
 * @param {Function} onClearMessages - 清空所有消息的回调函数
 * @param {boolean} isWaiting - 是否正在等待 AI 响应
 * @param {boolean} isReceiving - 是否正在接收消息
 * @param {number} maxLength - 最大允许字数，默认5000
 * @param {boolean} disabled - 是否禁用输入区
 * @param {string} placeholder - 输入框占位文本
 */
function InputArea({ 
  onSendMessage, 
  onAbortMessageReceiving,
  onOpenSettings,
  onClearMessages,
  isWaiting,
  isReceiving,
  maxLength = 5000,
  disabled = false,
  placeholder = '按 Enter 发送，Shift + Enter 换行'
}: InputAreaProps) {
  // 消息内容状态
  const [message, setMessage] = useState('')
  // 添加输入框引用
  const inputRef = useRef<HTMLTextAreaElement>(null)

  /**
   * 处理文本变化
   * 实时更新文本内容，同时确保不超过最大长度限制
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - 文本变化事件
   */
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      setMessage(newValue)
    }
  }

  /**
   * 处理消息发送
   * 1. 清理文本（去除多余空格等）
   * 2. 验证文本是否为空
   * 3. 检查组件是否处于可发送状态
   * 4. 发送成功后清空输入框并保持焦点
   */
  const handleSend = async () => {
    const cleanedMessage = cleanText(message)
    if (!isEmptyText(cleanedMessage) && !isWaiting && !isReceiving) {
      try {
        setMessage('') // 先清空内容，提供更好的用户体验
        await onSendMessage(cleanedMessage)
        // 重新聚焦输入框
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

  return (
    <div className="input-area">
      {/* 文本输入区域 */}
      <textarea
        ref={inputRef}
        value={message}
        onChange={handleMessageChange}
        onKeyDown={handleKeyDown}
        placeholder={isWaiting ? '正在等待 AI 响应...' : placeholder}
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
            <SettingsIcon />
          </button>
          {/* 清空会话按钮 */}
          <button 
            className="icon-button"
            onClick={onClearMessages}
            title="清空会话"
          >
            <ClearIcon />
          </button>
          {/* 停止/发送按钮（根据状态切换） */}
          {(isWaiting || isReceiving) ? (
            <button 
              className="icon-button"
              onClick={onAbortMessageReceiving}
              title="停止生成"
            >
              <StopIcon />
            </button>
          ) : (
            <button 
              className="icon-button"
              onClick={handleSend}
              title="发送"
              disabled={isEmptyText(cleanText(message))}
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
