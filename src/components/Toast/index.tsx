import { useEffect, useState } from 'react'
import './styles.css'

export interface ToastProps {
  message: string    // 提示消息文本
  type?: 'error' | 'info' | 'success'    // 提示类型及对应颜色
  duration?: number  // 显示时长(ms)
  onHide?: () => void  // 添加 onHide 回调
}

function Toast({ 
  message, 
  type = 'info',      // 默认为普通提示
  duration = 3000,    // 默认显示3秒
  onHide
}: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // 每当 message 改变时，重置显示状态和计时器
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onHide?.()  // 调用 onHide 回调
    }, duration)

    return () => clearTimeout(timer)
  }, [message, duration, onHide])

  if (!visible) return null

  return (
    <div 
      className={`toast ${type}`}
      role="alert"  // 辅助功能支持
    >
      {message}
    </div>
  )
}

export default Toast