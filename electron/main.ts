/**
 * Electron主进程入口文件
 */

import { app, BrowserWindow, globalShortcut } from 'electron'
import { APP_CONFIG, IS_MAC } from './config'
import { IPCHandler } from './ipc'
 

class MainApp {
  private window: BrowserWindow | null = null

  /**
   * 初始化应用程序
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
   */
  private async createWindow(): Promise<void> {
    const browserWindow = new BrowserWindow(APP_CONFIG.WINDOW)
    
    this.window = browserWindow

    // 等待窗口准备好再显示
    browserWindow.once('ready-to-show', () => {
      browserWindow.show()
    })

    if (APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL) {
      await browserWindow.loadURL(APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL)
    } else {
      await browserWindow.loadFile(APP_CONFIG.PRODUCTION.ENTRY_FILE)
    }
  }

  /**
   * 注册应用程序事件
   */
  private registerApplicationEvents(): void {
    app.on('window-all-closed', () => {
      this.window = null
      if (!IS_MAC) {
        app.quit()
      }
    })

    app.on('activate', async () => {
      if (!this.window) {
        await this.createWindow()
      }
    })

    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (this.window) {
        this.window.webContents.toggleDevTools()
      }
    })
  }
}

// 启动应用
const mainApp = new MainApp()
mainApp.init().catch(console.error)