/**
 * ipc.ts
 * IPC通信处理模块
 * 
 * 功能：
 * - 处理主进程和渲染进程间的通信
 * - 处理工具调用相关的IPC事件
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-25
 */

import { ipcMain } from 'electron'
import ToolManager from './tools/toolManager'

/**
 * IPC通信处理类
 * 负责管理所有IPC事件处理程序
 */
export class IPCHandler {
  /**
   * 初始化所有IPC处理程序
   */
  public static init(): void {
    this.registerIPCHandlers()
    console.log('IPC handlers initialized')
  }

  /**
   * 注册所有IPC处理程序
   */
  private static registerIPCHandlers(): void {
    const toolManager = ToolManager.getInstance()

    // 获取所有工具描述
    ipcMain.handle('get-tool-descriptions', () => {
      return toolManager.getAllToolDescriptions()
    })

    // 执行工具
    ipcMain.handle('execute-tool', async (_, toolName: string, params: any) => {
      return await toolManager.executeTool(toolName, params)
    })
  }
}
