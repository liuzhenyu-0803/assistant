/**
 * 组件相关类型统一导出
 * 
 * 聚合并重新导出components目录下所有UI组件相关的类型定义：
 * - 输入区组件类型：InputArea.ts - 用户输入和交互控件
 * - 消息列表组件类型：MessageList.ts - 对话消息展示
 * - Markdown渲染器类型：MarkdownRenderer.ts - Markdown内容和代码块渲染
 * 
 * @module types/components
 * @version 1.0.0
 * @lastModified 2025-03-02
 */

// 输入区组件类型
export * from './InputArea';

// 消息列表组件类型
export * from './MessageList';

// Markdown渲染器类型
export * from './MarkdownRenderer';
