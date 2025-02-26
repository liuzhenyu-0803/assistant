/**
 * 类型定义导出文件
 * 集中导出所有类型，便于统一管理和导入
 */

// 数据模型层
export * from './models/message'  // 消息相关类型
// 移除摘要相关类型的导出
// export * from './models/summary'  // 摘要相关类型

// 服务层
export * from './services/api'    // API相关类型
export * from './services/config' // 配置相关类型

// UI层
export * from './ui/props'        // 组件属性类型
export * from './ui/common'       // 通用UI类型

// 全局类型
export * from './global'         // 全局类型声明
