/**
 * 配置服务相关的类型定义
 * 
 * 定义系统配置的数据结构，包括：
 * - API服务配置
 * 
 * 这些配置由配置服务管理，用于应用的全局设置
 * 
 * @module types/services/config
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { APIConfig } from './api'

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
}
