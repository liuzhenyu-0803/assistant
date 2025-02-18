import { useEffect } from 'react'
import './styles.css'

export interface ToastProps {
  message: string    // 提示消息文本
  type?: 'error' | 'warning' | 'info'    // 提示类型及对应颜色
  duration?: number  // 显示时长(ms)
  onClose?: () => void  // 关闭回调
}

function Toast({ 
  message, 
  type = 'info',      // 默认为普通提示
  duration = 3000,    // 默认显示3秒
  onClose 
}: ToastProps) {
  useEffect(() => {
    // 组件挂载或 duration/onClose 变化时创建新的定时器
    const timer = setTimeout(() => {
      onClose?.()  // 安全调用回调
    }, duration)
    
    // 组件卸载或 duration/onClose 变化前清理旧的定时器
    return () => clearTimeout(timer)
  }, [duration, onClose])  // 时长或回调变化时重置

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