/**
 * preload.ts
 * Electron预加载脚本
 * 
 * 功能：
 * - 暴露主进程的IPC通信接口给渲染进程
 * - 提供安全的跨进程通信桥接
 * - 注入全局API到window对象
 * - 暴露工具系统API
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-25
 */

import { contextBridge, ipcRenderer } from 'electron'
import { ToolDescription, ToolResult } from './tools/toolManager'

/**
 * 向渲染进程暴露的API接口
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 工具系统API
  tools: {
    /**
     * 获取所有可用工具的描述
     * @returns 工具描述列表
     */
    getToolDescriptions: (): Promise<ToolDescription[]> => {
      return ipcRenderer.invoke('get-tool-descriptions')
    },

    /**
     * 执行指定工具
     * @param toolName 工具名称
     * @param params 工具参数
     * @returns 工具执行结果
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
      tools: {
        getToolDescriptions: () => Promise<ToolDescription[]>
        executeTool: (toolName: string, params: any) => Promise<ToolResult>
      }
    }
  }
}
