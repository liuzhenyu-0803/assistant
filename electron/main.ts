import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs/promises'

// 应用程序的基本配置
const APP_CONFIG = {
  // 窗口配置
  WINDOW: {
    WIDTH: 600,
    HEIGHT: 700,
    MIN_WIDTH: 500,
    MIN_HEIGHT: 700,
  },
  // 开发环境配置
  DEV: {
    VITE_DEV_SERVER_URL: process.env['VITE_DEV_SERVER_URL'],
  }
}

class MainApp {
  private mainWindow: BrowserWindow | null = null
  private readonly isMac: boolean = process.platform === 'darwin'
  private readonly isDevMode: boolean = process.env.NODE_ENV === 'development'
  private readonly appRoot: string

  constructor() {
    const require = createRequire(import.meta.url)
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    this.appRoot = path.join(__dirname, '..')

    // 设置应用程序路径
    process.env.APP_ROOT = this.appRoot
    process.env.VITE_PUBLIC = APP_CONFIG.DEV.VITE_DEV_SERVER_URL 
      ? path.join(this.appRoot, 'public') 
      : path.join(this.appRoot, 'dist')
  }

  private async createWindow(): Promise<void> {
    try {
      // 创建浏览器窗口
      this.mainWindow = new BrowserWindow({
        width: APP_CONFIG.WINDOW.WIDTH,
        height: APP_CONFIG.WINDOW.HEIGHT,
        minWidth: APP_CONFIG.WINDOW.MIN_WIDTH,
        minHeight: APP_CONFIG.WINDOW.MIN_HEIGHT,
        frame: true,
        title: 'AI助手',
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        webPreferences: {
          preload: path.join(this.appRoot, 'dist-electron/preload.mjs'),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
        },
        show: false,
        autoHideMenuBar: true,
        backgroundColor: '#1e1f2b',
        transparent: false,
        roundedCorners: true,
        thickFrame: true,
        vibrancy: 'under-window',
      })

      // 添加窗口事件监听
      this.setupWindowEvents()

      // 加载应用
      await this.loadApp()

      // 显示窗口
      this.mainWindow.show()
    } catch (error) {
      console.error('Error creating window:', error)
    }
  }

  private setupWindowEvents(): void {
    if (!this.mainWindow) return

    // 监听窗口加载完成事件
    this.mainWindow.webContents.on('did-finish-load', () => {
      console.log('Window loaded successfully')
    })

    // 监听加载失败事件
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription)
    })

    // 添加快捷键打开开发者工具
    this.mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'i') {
        this.mainWindow?.webContents.toggleDevTools()
        event.preventDefault()
      }
    })
  }

  private async loadApp(): Promise<void> {
    if (!this.mainWindow) return

    try {
      if (APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
        console.log('Loading URL:', APP_CONFIG.DEV.VITE_DEV_SERVER_URL)
        await this.mainWindow.loadURL(APP_CONFIG.DEV.VITE_DEV_SERVER_URL)
      } else {
        const indexHtml = path.join(this.appRoot, 'dist/index.html')
        console.log('Loading file:', indexHtml)
        await this.mainWindow.loadFile(indexHtml)
      }
    } catch (error) {
      console.error('Error loading app:', error)
    }
  }

  private setupAppEvents(): void {
    // 当所有窗口关闭时退出应用
    app.on('window-all-closed', () => {
      this.mainWindow = null
      if (!this.isMac) {
        app.quit()
      }
    })

    // 当应用被激活时重新创建窗口（macOS）
    app.on('activate', async () => {
      if (!this.mainWindow) {
        await this.createWindow()
      }
    })

    // 设置安全策略
    app.on('web-contents-created', (_, contents) => {
      // 禁用导航
      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl)
        if (this.isDevMode && parsedUrl.origin === APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
          return
        }
        console.log('Blocked navigation to:', navigationUrl)
        event.preventDefault()
      })

      // 禁用新窗口创建
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' }
      })
    })
  }

  private setupIPC(): void {
    // 处理配置文件的读写
    ipcMain.handle('read-config', async (_, configPath: string) => {
      try {
        const localAppDataPath = app.getPath('userData').replace('Roaming', 'Local')
        const fullPath = path.join(localAppDataPath, configPath)
        
        try {
          await fs.access(fullPath)
        } catch {
          // 如果文件不存在，创建一个空的配置文件
          await fs.writeFile(fullPath, JSON.stringify({}, null, 2), 'utf-8')
        }
        
        const data = await fs.readFile(fullPath, 'utf-8')
        return { success: true, data }
      } catch (error) {
        console.error('Error reading config:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        }
      }
    })

    ipcMain.handle('write-config', async (_, configPath: string, data: string) => {
      try {
        const localAppDataPath = app.getPath('userData').replace('Roaming', 'Local')
        const fullPath = path.join(localAppDataPath, configPath)
        
        // 确保目录存在
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        
        await fs.writeFile(fullPath, data, 'utf-8')
        return { success: true }
      } catch (error) {
        console.error('Error writing config:', error)
        return { 
          success: false, 
          error: error instanceof Error ? error.message : String(error)
        }
      }
    })
  }

  public async init(): Promise<void> {
    try {
      // 等待应用准备就绪
      await app.whenReady()

      // 设置IPC处理程序
      this.setupIPC()
      
      // 设置应用事件监听
      this.setupAppEvents()

      // 创建主窗口
      await this.createWindow()

      console.log('Application initialized successfully')
    } catch (error) {
      console.error('Error initializing app:', error)
      app.quit()
    }
  }
}

// 启动应用
const mainApp = new MainApp()
mainApp.init().catch(console.error)
