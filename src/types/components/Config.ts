/**
 * 配置相关的通用类型定义
 * 
 * 包含应用各个方面的配置选项类型定义：
 * - UI界面配置（主题、字体、显示选项等）
 * - 快捷键配置
 * - 消息处理配置
 * 
 * @module types/components/Config
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { ThemeConfig } from './Common';

/**
 * UI界面配置接口
 * 
 * 定义用户界面的各种外观和行为设置
 */
export interface UIConfig {
  /**
   * 主题模式
   * 使用ThemeConfig的mode字段，可选值：'light'|'dark'|'system'
   */
  theme: ThemeConfig['mode'];
  
  /**
   * 字体大小（像素）
   * 控制应用中文本的显示大小
   */
  fontSize: number;
  
  /**
   * 是否显示消息时间戳
   * 为true时在每条消息旁显示发送时间
   */
  showTimestamp: boolean;
  
  /**
   * 是否启用声音提示
   * 为true时在收到新消息等事件时播放提示音
   */
  enableSound: boolean;
}

/**
 * 快捷键配置接口
 * 
 * 定义应用中各种操作的键盘快捷方式
 * 使用标准键盘组合表示法，如"Ctrl+Enter"
 */
export interface ShortcutConfig {
  /**
   * 发送消息的快捷键
   * 默认值: "Ctrl+Enter"
   */
  send: string;
  
  /**
   * 清空当前对话的快捷键
   * 默认值: "Ctrl+L"
   */
  clear: string;
  
  /**
   * 打开设置面板的快捷键
   * 默认值: "Ctrl+,"
   */
  settings: string;
}

/**
 * 消息配置接口
 * 
 * 定义消息处理和存储的相关设置
 */
export interface MessageConfig {
  /**
   * 最大历史消息存储数量
   * 超出此数量的旧消息将被移除
   */
  maxHistorySize: number;
  
  /**
   * 是否自动保存对话历史
   * 为true时将按指定间隔保存对话
   */
  autoSave: boolean;
  
  /**
   * 自动保存的时间间隔（毫秒）
   * 仅当autoSave为true时有效
   */
  saveInterval: number;
}
