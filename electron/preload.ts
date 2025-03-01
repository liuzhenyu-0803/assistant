/**
 * preload.ts
 * Electron预加载脚本
 * 
 * 功能：
 * - 暴露主进程的IPC通信接口给渲染进程
 * - 提供安全的跨进程通信桥接
 */

import { contextBridge, ipcRenderer } from 'electron'
import { ToolResult, SerializableToolDefinition } from './types'

/**
 * 向渲染进程暴露的API接口
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 插件系统API
  plugins: {
    /**
     * 获取所有已加载插件的信息
     */
    getPluginsInfo: () => {
      return ipcRenderer.invoke('get-plugins-info')
    }
  },
  
  // 工具系统API
  tools: {
    /**
     * 获取所有可用工具的描述
     */
    getToolDescriptions: (): Promise<SerializableToolDefinition[]> => {
      return ipcRenderer.invoke('get-tool-descriptions')
    },

    /**
     * 执行指定工具
     * @param toolName 工具名称
     * @param params 工具参数
     */
    executeTool: (toolName: string, params: any): Promise<ToolResult> => {
      return ipcRenderer.invoke('execute-tool', toolName, params)
    }
  }
})

/**
 * 全局Window接口扩展
 */
declare global {
  interface Window {
    electronAPI: {
      plugins: {
        getPluginsInfo: () => Promise<any[]>
      },
      tools: {
        getToolDescriptions: () => Promise<SerializableToolDefinition[]>
        executeTool: (toolName: string, params: any) => Promise<ToolResult>
      }
    }
  }
}
