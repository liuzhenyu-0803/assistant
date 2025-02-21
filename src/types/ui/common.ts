/**
 * UI 通用类型定义
 */

/** Toast 消息类型 */
export type ToastType = 'error' | 'info' | 'success' | 'warning'

/** Toast 位置 */
export type ToastPosition = 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

/** Toast 数据接口 */
export interface ToastData {
  /** 提示消息内容 */
  message: string
  /** 提示消息类型 */
  type: ToastType
  /** 显示位置 */
  position?: ToastPosition
  /** 显示时长（毫秒） */
  duration?: number
  /** 是否可手动关闭 */
  closable?: boolean
  /** 关闭回调函数 */
  onClose?: () => void
}

/** 主题配置接口 */
export interface ThemeConfig {
  /** 主题模式 */
  mode: 'light' | 'dark' | 'system'
  /** 主色调 */
  primary: string
  /** 次要色调 */
  secondary: string
  /** 背景色 */
  background: string
  /** 文本色 */
  text: string
  /** 边框色 */
  border: string
  /** 阴影配置 */
  shadow: {
    /** 小阴影 */
    sm: string
    /** 中阴影 */
    md: string
    /** 大阴影 */
    lg: string
  }
  /** 圆角配置 */
  radius: {
    /** 小圆角 */
    sm: string
    /** 中圆角 */
    md: string
    /** 大圆角 */
    lg: string
  }
}
