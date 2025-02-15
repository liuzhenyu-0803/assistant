/**
 * icons/index.tsx
 * 图标组件集合
 * 
 * 包含：
 * - SendIcon: 发送按钮图标
 * - StopIcon: 停止接收图标
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-15
 */

import React from 'react'
import './styles.css'

export const SendIcon: React.FC = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
  </svg>
)

export const StopIcon: React.FC = () => (
  <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" />
  </svg>
)
