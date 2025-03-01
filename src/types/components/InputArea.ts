/**
 * 输入区组件相关类型定义
 * 
 * 定义与用户输入区域相关的属性和状态类型，
 * 包括消息发送、状态控制和UI配置等。
 * 
 * @module types/components/InputArea
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

import { MessageStatus } from '../services/message';

/**
 * 输入区组件属性接口
 * 
 * 定义输入区域组件所需的所有属性，包括：
 * - 各种交互回调函数
 * - 状态控制属性
 * - UI配置选项
 */
export interface InputAreaProps {
  /**
   * 发送消息的回调函数
   * 当用户提交输入时触发，返回Promise以支持异步处理
   * @param message 用户输入的文本内容
   */
  onSendMessage: (message: string) => Promise<void>;
  
  /**
   * 终止消息接收的回调函数
   * 用于中断正在进行的消息生成过程
   */
  onAbort: () => void;
  
  /**
   * 打开设置面板的回调函数
   * 当用户点击设置按钮时触发
   */
  onOpenSettings: () => void;
  
  /**
   * 清空当前对话的回调函数
   * 当用户选择清除所有消息时触发
   */
  onClearConversation: () => void;
  
  /**
   * 当前消息处理状态
   * 控制输入区的交互状态和UI反馈
   */
  status: MessageStatus;
  
  /**
   * 输入框允许的最大字符数
   * @default undefined (无限制)
   */
  maxLength?: number;
  
  /**
   * 是否禁用输入区
   * 为true时用户无法输入或交互
   * @default false
   */
  disabled?: boolean;
  
  /**
   * 输入框的占位提示文本
   * 显示在空输入框中的提示信息
   * @default "输入您的问题..."
   */
  placeholder?: string;
}
