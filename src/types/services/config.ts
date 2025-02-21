/**
 * 配置服务相关的类型定义
 */

import { APIConfig } from './api'

/** 系统配置接口 */
export interface SystemConfig {
  /** API 配置 */
  apiConfig: APIConfig
  /** 界面配置 */
  uiConfig?: {
    /** 主题模式 */
    theme: 'light' | 'dark' | 'system'
    /** 字体大小 */
    fontSize: number
    /** 是否显示时间戳 */
    showTimestamp: boolean
    /** 是否启用声音提示 */
    enableSound: boolean
  }
  /** 消息配置 */
  messageConfig?: {
    /** 最大历史消息数 */
    maxHistorySize: number
    /** 是否自动保存历史记录 */
    autoSave: boolean
    /** 保存间隔（毫秒） */
    saveInterval: number
  }
  /** 快捷键配置 */
  shortcutConfig?: {
    /** 发送消息 */
    send: string
    /** 清空对话 */
    clear: string
    /** 打开设置 */
    settings: string
  }
}
