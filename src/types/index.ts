/**
 * 类型定义系统 - 根入口文件
 * 
 * 类型系统架构采用分层设计，按照功能模块组织类型：
 * - services：服务层类型，包括API接口、数据模型和服务接口定义
 * - components：组件层类型，包括UI组件属性和状态类型定义
 * - utils：工具层类型，包括辅助函数的参数和返回值类型
 * - global：全局类型声明，定义跨模块共享的通用类型
 * 
 * @module types
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

// 服务层类型（包含数据模型和服务接口）
export * from './services';

// 组件层类型（UI组件属性和状态定义）
export * from './components';

// 工具层类型（辅助函数相关类型）
export * from './utils';

// 全局类型（跨模块共享的通用类型）
export * from './global';
