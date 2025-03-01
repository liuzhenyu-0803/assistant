/**
 * 消息列表组件相关类型定义
 * 
 * 定义与消息列表显示和交互相关的组件属性类型。
 * 
 * @module types/components/MessageList
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { Message } from '../services/message';

/**
 * 消息列表组件属性接口
 * 
 * 用于配置消息列表的显示方式和内容
 */
export interface MessageListProps {
  /**
   * 消息列表数据
   * 包含所有需要展示的消息对象
   */
  messages: Message[];
  
  /**
   * 是否显示时间戳
   * 控制每条消息是否显示发送时间
   * @default false
   */
  showTimestamp?: boolean;
  
  /**
   * 消息容器最大高度
   * 超出此高度将显示滚动条
   * 可以是像素值或CSS的其他有效单位
   */
  maxHeight?: number | string;
}

// 注意：单条消息项的属性类型(MessageProps)已在对应组件内直接定义
