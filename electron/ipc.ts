/**
 * ipc.ts
 * IPC通信处理模块
 * 
 * 功能：
 * - 处理主进程和渲染进程间的通信
 * - 管理配置文件的读写
 * - 处理系统对话框操作
 * - 实现文件系统访问
 * - 提供安全的跨进程API
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-17
 */

import { ipcMain, app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * IPC通信处理类
 * 负责管理所有的IPC事件处理程序
 */
export class IPCHandler {
  /**
   * 初始化所有IPC处理程序
   * 在应用启动时调用此方法注册所有IPC事件
   */
  public static init(): void {
    IPCHandler.registerConfigHandlers()
    console.log('IPC handlers initialized')
  }

  /**
   * 注册配置相关的IPC处理程序
   * 包括配置文件的读取和写入操作
   */
  private static registerConfigHandlers(): void {
    // 处理配置读取请求
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

    // 处理配置写入请求
    ipcMain.handle('config:write', async (_, configPath: string, data: string) => {
      try {
        const fullPath = IPCHandler.getConfigPath(configPath)
        console.log('Writing config to:', fullPath)
        
        // 确保配置目录存在
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        
        // 写入新的配置数据
        await fs.writeFile(fullPath, data, 'utf-8')
        console.log('Config written successfully')
        
        // 验证写入结果
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
   * @param configPath - 相对于用户数据目录的配置文件路径
   * @returns 配置文件的绝对路径
   */
  private static getConfigPath(configPath: string): string {
    const userDataPath = app.getPath('userData')
    console.log('User data path:', userDataPath)
    const fullPath = path.join(userDataPath, configPath)
    console.log('Full config path:', fullPath)
    return fullPath
  }

  /**
   * 初始化配置文件
   * 如果配置文件不存在，则创建包含默认配置的文件
   * @param fullPath - 配置文件的完整路径
   */
  private static async initializeConfigFile(fullPath: string): Promise<void> {
    try {
      // 确保配置目录存在
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      
      try {
        await fs.access(fullPath)
      } catch {
        // 创建默认配置文件
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
