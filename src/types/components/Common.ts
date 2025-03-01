/**
 * 通用UI类型定义
 * 
 * 包含通用的UI相关接口和类型定义，主要用于：
 * - 主题配置
 * - 样式系统
 * - 通用UI组件属性
 * 
 * @module types/components/Common
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

/**
 * 主题配置接口
 * 定义应用的主题样式系统，包括主题模式和各种样式变量
 */
export interface ThemeConfig {
  /**
   * 主题模式
   * - light: 浅色主题
   * - dark: 深色主题
   * - system: 跟随系统设置
   */
  mode: 'light' | 'dark' | 'system'
  
  /**
   * 颜色配置
   * 定义应用的主要颜色变量
   */
  primary: string    // 主色调
  secondary: string  // 次要色调
  background: string // 背景色
  text: string       // 文本颜色
  border: string     // 边框颜色
  
  /**
   * 阴影配置
   * 用于各种元素的阴影效果
   */
  shadow: {
    sm: string  // 小阴影，用于小型UI元素
    md: string  // 中阴影，用于普通元素
    lg: string  // 大阴影，用于弹出层和强调元素
  }
  
  /**
   * 圆角配置
   * 用于各种元素的圆角样式
   */
  radius: {
    sm: string  // 小圆角，用于按钮等小元素
    md: string  // 中圆角，用于卡片等中等元素
    lg: string  // 大圆角，用于对话框等大型元素
  }
}
