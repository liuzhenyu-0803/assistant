/**
 * main.ts
 * Electron主进程入口文件
 * 
 * 功能：
 * - 创建和管理应用窗口
 * - 处理应用生命周期
 * - 注册全局快捷键
 * - 配置应用菜单和托盘
 * - 管理进程间通信
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-17
 */

import { app, BrowserWindow, globalShortcut } from 'electron'
import { APP_CONFIG, IS_MAC } from './config'
import { IPCHandler } from './ipc'

/**
 * 主应用程序类
 * 负责管理应用的生命周期和窗口
 */
class MainApp {
  private window: BrowserWindow | null = null

  /**
   * 初始化应用程序
   * 创建窗口、注册事件处理程序和IPC通信
   * @throws 初始化失败时抛出错误
   */
  public async init(): Promise<void> {
    try {
      await app.whenReady()
      await this.createWindow()

      this.registerApplicationEvents()
      IPCHandler.init()
    } catch (error) {
      console.error('Failed to initialize application:', error)
      app.quit()
    }
  }

  /**
   * 创建主窗口
   * 根据环境配置加载不同的页面内容
   */
  private async createWindow(): Promise<void> {
    const browserWindow = new BrowserWindow(APP_CONFIG.WINDOW)
    
    this.window = browserWindow

    // 窗口准备就绪后显示
    browserWindow.once('ready-to-show', () => {
      browserWindow.show()
    })

    // 根据环境加载页面
    if (APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL) {
      await browserWindow.loadURL(APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL)
    } else {
      await browserWindow.loadFile(APP_CONFIG.PRODUCTION.ENTRY_FILE)
    }
  }

  /**
   * 注册应用程序事件处理程序
   * 包括：
   * - 窗口关闭事件
   * - 应用激活事件（macOS）
   * - 开发者工具快捷键
   */
  private registerApplicationEvents(): void {
    // 处理窗口关闭事件
    app.on('window-all-closed', () => {
      this.window = null
      if (!IS_MAC) {
        app.quit()
      }
    })

    // 处理应用激活事件（macOS）
    app.on('activate', async () => {
      if (!this.window) {
        await this.createWindow()
      }
    })

    // 注册开发者工具快捷键
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (this.window) {
        this.window.webContents.toggleDevTools()
      }
    })
  }
}

// 启动应用实例
const mainApp = new MainApp()
mainApp.init().catch(console.error)