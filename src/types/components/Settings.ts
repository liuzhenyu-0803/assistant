/**
 * 设置组件相关类型定义
 * 
 * 定义设置面板所需的数据结构和组件属性类型，
 * 用于管理应用的各种配置选项。
 * 
 * @module types/components/Settings
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { APIConfig } from '../services/api';

/**
 * 设置数据接口
 * 
 * 定义应用所有可配置的设置项，包括：
 * - API配置（提供商、密钥等）
 */
export interface SettingsData {
  /**
   * API相关设置
   * 包含API提供商、密钥和模型选择等配置
   */
  api: APIConfig;
}

/**
 * 注意：设置组件的属性接口(SettingsProps)已在组件内部直接定义，
 * 避免重复定义和维护两份相似代码
 */
