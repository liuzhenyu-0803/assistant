/**
 * IPC 通信处理模块
 * 处理主进程和渲染进程之间的通信
 */

import { ipcMain, app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

export class IPCHandler {
  /**
   * 初始化所有IPC处理程序
   */
  public static init(): void {
    IPCHandler.registerConfigHandlers()
    console.log('IPC handlers initialized')
  }

  /**
   * 注册配置文件相关的处理程序
   */
  private static registerConfigHandlers(): void {
    // 读取配置
    ipcMain.handle('config:read', async (_, configPath: string) => {
      try {
        const fullPath = IPCHandler.getConfigPath(configPath)
        console.log('Reading config from:', fullPath)
        
        await IPCHandler.initializeConfigFile(fullPath)
        const data = await fs.readFile(fullPath, 'utf-8')
        console.log('Config data read:', data)
        
        return { success: true, data }
      } catch (error) {
        console.error('Error reading config:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        }
      }
    })

    // 写入配置
    ipcMain.handle('config:write', async (_, configPath: string, data: string) => {
      try {
        const fullPath = IPCHandler.getConfigPath(configPath)
        console.log('Writing config to:', fullPath)
        console.log('Config data to write:', data)
        
        // 确保目录存在
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        
        // 写入配置
        await fs.writeFile(fullPath, data, 'utf-8')
        console.log('Config written successfully')
        
        // 验证写入是否成功
        const written = await fs.readFile(fullPath, 'utf-8')
        if (written === data) {
          console.log('Config write verified')
          return { success: true }
        } else {
          throw new Error('Config verification failed')
        }
      } catch (error) {
        console.error('Error writing config:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        }
      }
    })
  }

  /**
   * 获取配置文件的完整路径
   */
  private static getConfigPath(configPath: string): string {
    // 使用 userData 目录，这样在开发和生产环境下都能正确保存
    const userDataPath = app.getPath('userData')
    console.log('User data path:', userDataPath)
    const fullPath = path.join(userDataPath, configPath)
    console.log('Full config path:', fullPath)
    return fullPath
  }

  /**
   * 确保配置文件存在，如果不存在则创建
   */
  private static async initializeConfigFile(fullPath: string): Promise<void> {
    try {
      // 确保目录存在
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      
      try {
        await fs.access(fullPath)
      } catch {
        // 文件不存在时创建默认配置
        const defaultConfig = {
          apiConfig: {
            provider: 'openrouter',
            apiKey: '',
            selectedModel: 'openai/gpt-3.5-turbo'
          }
        }
        await fs.writeFile(fullPath, JSON.stringify(defaultConfig, null, 2), 'utf-8')
        console.log('Created default config file')
      }
    } catch (error) {
      console.error('Error ensuring config file:', error)
      throw error
    }
  }
}
