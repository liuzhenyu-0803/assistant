/**
 * preload.ts
 * Electron预加载脚本
 * 
 * 功能：
 * - 暴露主进程的IPC通信接口给渲染进程
 * - 提供安全的跨进程通信桥接
 * - 注入全局API到window对象
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-17
 */

import { contextBridge } from 'electron'

/**
 * 向渲染进程暴露的API接口
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 这里可以添加其他需要的 API
})

/**
 * 全局Window接口扩展
 */
declare global {
  interface Window {
    electronAPI: {
      // 这里可以添加其他需要的 API 类型定义
    }
  }
}
