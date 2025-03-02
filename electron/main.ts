/**
 * main.ts
 * Electron主进程入口文件
 * 
 * 功能：
 * - 创建和管理应用程序窗口
 * - 处理应用程序生命周期
 * - 初始化和管理插件系统
 */

import { app, BrowserWindow, globalShortcut } from 'electron'
import { APP_CONFIG, IS_MAC } from './config'
import { IPCHandler } from './ipc'
import PluginManager from './plugins/pluginManager'

/**
 * 主应用类
 * 负责管理应用程序生命周期和窗口
 */
class MainApp {
  private window: BrowserWindow | null = null

  /**
   * 初始化应用程序
   * 创建窗口，注册事件处理程序和IPC通信
   * @throws Error 当初始化失败时抛出
   */
  public async init(): Promise<void> {
    try {
      await app.whenReady()
      
      // 初始化插件系统
      await PluginManager.getInstance().initializePlugins();
      
      this.registerApplicationEvents()
      IPCHandler.init()
      await this.createWindow()
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

    // 准备好时显示窗口
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
   */
  private registerApplicationEvents(): void {
    // 处理窗口关闭事件
    app.on('window-all-closed', () => {
      this.window = null
      if (!IS_MAC) {
        app.quit()
      }
    })

    // 处理应用程序激活事件（macOS）
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

// 启动应用程序实例
const mainApp = new MainApp()
mainApp.init().catch((error) => console.error('An error occurred:', error))
