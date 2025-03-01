/**
 * ipc.ts
 * IPC通信模块
 * 
 * 功能：
 * - 处理主进程和渲染进程之间的通信
 * - 处理与插件和工具相关的IPC事件
 * 
 * @author AI助手开发团队
 * @lastModified 2025-03-01
 */

import { ipcMain } from 'electron'
import PluginManager from './plugins/pluginManager'

/**
 * IPC处理器类
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
    const pluginManager = PluginManager.getInstance()

    // 获取所有插件信息
    ipcMain.handle('get-plugins-info', () => {
      return pluginManager.getPluginsInfo()
    })

    // 获取所有工具描述
    ipcMain.handle('get-tool-descriptions', () => {
      return pluginManager.getAllToolDefinitions()
    })

    // 执行工具
    ipcMain.handle('execute-tool', async (_, toolName: string, params: any) => {
      return await pluginManager.executeTool(toolName, params)
    })
  }
}
