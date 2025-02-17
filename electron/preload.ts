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

import { contextBridge, ipcRenderer } from 'electron'

/**
 * 向渲染进程暴露的API接口
 * 提供安全的配置文件读写功能
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 读取配置文件
   * @param configPath - 配置文件路径
   * @returns 包含配置数据的Promise
   */
  readConfig: (configPath: string) => ipcRenderer.invoke('config:read', configPath),
  
  /**
   * 写入配置文件
   * @param configPath - 配置文件路径
   * @param data - 要写入的配置数据
   * @returns 包含操作结果的Promise
   */
  writeConfig: (configPath: string, data: string) => ipcRenderer.invoke('config:write', configPath, data)
})

/**
 * 全局Window接口扩展
 * 定义electronAPI的类型
 */
declare global {
  interface Window {
    electronAPI: {
      readConfig: (configPath: string) => Promise<any>;
      writeConfig: (configPath: string, data: string) => Promise<any>;
    }
  }
}
