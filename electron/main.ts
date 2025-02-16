/**
 * Electron主进程入口文件
 */

import { app, BrowserWindow, Menu, globalShortcut } from 'electron'
import { APP_CONFIG, IS_MAC } from './config'
import { IPCHandler } from './ipc'

class MainApp {
  private mainWindow: BrowserWindow | null = null

  /**
   * 初始化应用程序
   */
  public async init(): Promise<void> {
    try {
      await app.whenReady()
      Menu.setApplicationMenu(null)
      IPCHandler.init()
      await this.createWindow()
      this.setupAppEvents()
    } catch (error) {
      console.error('Failed to initialize application:', error)
      app.quit()
    }
  }

  /**
   * 创建主窗口
   */
  private async createWindow(): Promise<void> {
    const window = new BrowserWindow(APP_CONFIG.WINDOW)

    this.mainWindow = window

    // 等待窗口准备好再显示
    window.once('ready-to-show', () => {
      window.show()
    })

    if (APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL) {
      await window.loadURL(APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL)
    } else {
      await window.loadFile(APP_CONFIG.PRODUCTION.ENTRY_FILE)
    }
  }

  /**
   * 设置应用事件
   */
  private setupAppEvents(): void {
    app.on('window-all-closed', () => {
      this.mainWindow = null
      if (!IS_MAC) {
        app.quit()
      }
    })

    app.on('activate', async () => {
      if (!this.mainWindow) {
        await this.createWindow()
      }
    })

    // 添加开发者工具快捷键
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (this.mainWindow) {
        this.mainWindow.webContents.toggleDevTools()
      }
    })
  }
}

// 启动应用
const mainApp = new MainApp()
mainApp.init().catch(console.error)
