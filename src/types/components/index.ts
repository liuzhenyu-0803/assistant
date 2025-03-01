/**
 * 组件相关类型统一导出
 * 
 * 聚合并重新导出components目录下所有UI组件相关的类型定义：
 * - 通用UI类型：Common.ts - 包含主题等基础UI配置
 * - 输入区组件类型：InputArea.ts - 用户输入和交互控件
 * - 消息列表组件类型：MessageList.ts - 对话消息展示
 * - 设置组件类型：Settings.ts - 应用配置界面
 * - 渲染器组件类型：Renderers.ts - 内容渲染组件
 * 
 * @module types/components
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

// 通用UI类型
export * from './Common';

// 输入区组件类型
export * from './InputArea';

// 消息列表组件类型
export * from './MessageList';

// 设置组件类型
export * from './Settings';

// 渲染器组件类型
export * from './Renderers';
