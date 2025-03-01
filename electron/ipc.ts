/**
 * ipc.ts
 * IPC communication module
 * 
 * Features:
 * - Handle communication between main process and renderer process
 * - Handle IPC events related to plugins and tools
 * 
 * @author AI Assistant Development Team
 * @lastModified 2025-03-01
 */

import { ipcMain } from 'electron'
import PluginManager from './plugins/pluginManager'

/**
 * IPC Handler Class
 * Responsible for managing all IPC event handlers
 */
export class IPCHandler {
  /**
   * Initialize all IPC handlers
   */
  public static init(): void {
    this.registerIPCHandlers()
    console.log('IPC handlers initialized')
  }

  /**
   * Register all IPC handlers
   */
  private static registerIPCHandlers(): void {
    const pluginManager = PluginManager.getInstance()

    // Get all plugin information
    ipcMain.handle('get-plugins-info', () => {
      return pluginManager.getPluginsInfo()
    })

    // Get all tool descriptions
    ipcMain.handle('get-tool-descriptions', () => {
      return pluginManager.getAllToolDefinitions()
    })

    // Execute tool
    ipcMain.handle('execute-tool', async (_, toolName: string, params: any) => {
      return await pluginManager.executeTool(toolName, params)
    })
  }
}
