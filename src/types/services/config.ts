/**
 * 配置服务相关的类型定义
 * 
 * 定义系统配置的数据结构，包括：
 * - API服务配置
 * - 用户界面配置
 * - 消息处理配置
 * - 快捷键配置
 * 
 * 这些配置由配置服务管理，用于应用的全局设置
 * 
 * @module types/services/config
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { APIConfig } from './api'
import { UIConfig, ShortcutConfig, MessageConfig } from '../components/Config'

/**
 * 系统配置接口
 * 
 * 定义整个应用的配置数据结构，
 * 用于在应用启动时加载和运行过程中管理全局设置
 */
export interface SystemConfig {
  /**
   * API 服务配置
   * 包含API提供商、密钥和模型选择等重要配置
   * 所有API通信都依赖此配置
   */
  apiConfig: APIConfig
  
  /**
   * 用户界面配置
   * 控制应用的主题、字体大小和显示选项等
   * 如不提供则使用默认设置
   */
  uiConfig?: UIConfig
  
  /**
   * 消息管理配置
   * 控制消息历史记录的存储和自动保存行为
   * 如不提供则使用默认设置
   */
  messageConfig?: MessageConfig
  
  /**
   * 快捷键配置
   * 定义应用中各操作的键盘快捷方式
   * 如不提供则使用默认快捷键
   */
  shortcutConfig?: ShortcutConfig
}
