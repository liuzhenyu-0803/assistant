/**
 * 服务层类型定义统一导出
 * 
 * 聚合并重新导出services目录下所有服务相关的类型定义：
 * - API服务类型：api.ts - 与AI服务通信的接口和数据结构
 * - 配置服务类型：config.ts - 应用全局配置管理
 * - 函数调用类型：functions.ts - AI函数调用的规范和结构
 * - 消息类型：message.ts - 聊天消息的数据模型
 * 
 * 应用代码应当从此统一入口导入服务层类型，
 * 以便于维护和重构。
 * 
 * @module types/services
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

// API服务类型和数据模型
export * from './api';

// 配置服务类型
export * from './config';

// 函数调用类型
export * from './functions';

// 消息类型
export * from './message';
