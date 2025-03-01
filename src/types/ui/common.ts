/**
 * UI 通用类型定义
 */


/** 主题配置接口 */
export interface ThemeConfig {
  /** 主题模式 */
  mode: 'light' | 'dark' | 'system'
  
  /** 颜色配置 */
  primary: string
  secondary: string
  background: string
  text: string
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
