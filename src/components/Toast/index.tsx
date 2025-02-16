/**
 * Toast/index.tsx
 * 全局提示组件
 * 
 * 功能：
 * - 显示错误/警告/提示信息
 * - 自动消失
 * - 支持多条消息队列
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-16
 */

import React, { useEffect } from 'react'
import './styles.css'

export interface ToastProps {
  message: string
  type?: 'error' | 'warning' | 'info'
  duration?: number
  onClose?: () => void
}

export const Toast: React.FC<ToastProps> = ({ 
  message,
  type = 'info',
  duration = 3000,
  onClose
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className="toast-root">
      <div className="toast-container">
        <div className={`toast ${type}`}>
          {message}
        </div>
      </div>
    </div>
  );
};

export default Toast
