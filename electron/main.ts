/**
 * main.ts
 * Electron main process entry file
 * 
 * Features:
 * - Create and manage application windows
 * - Handle application lifecycle
 * - Register global shortcuts
 * - Configure application menu and tray
 * - Manage inter-process communication
 * - Initialize and manage plugin system
 * 
 * @author AI Assistant Development Team
 * @lastModified 2025-03-01
 */

import { app, BrowserWindow, globalShortcut } from 'electron'
import { APP_CONFIG, IS_MAC } from './config'
import { IPCHandler } from './ipc'
import PluginManager from './plugins/pluginManager'

/**
 * Main application class
 * Responsible for managing application lifecycle and windows
 */
class MainApp {
  private window: BrowserWindow | null = null

  /**
   * Initialize application
   * Create window, register event handlers and IPC communication
   * @throws Error when initialization fails
   */
  public async init(): Promise<void> {
    try {
      await app.whenReady()
      
      // Initialize plugin system
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
   * Create main window
   * Load different page content based on environment configuration
   */
  private async createWindow(): Promise<void> {
    const browserWindow = new BrowserWindow(APP_CONFIG.WINDOW)
    
    this.window = browserWindow

    // Show window when ready
    browserWindow.once('ready-to-show', () => {
      browserWindow.show()
    })

    // Load page based on environment
    if (APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL) {
      await browserWindow.loadURL(APP_CONFIG.DEVELOPMENT.VITE_DEV_SERVER_URL)
    } else {
      await browserWindow.loadFile(APP_CONFIG.PRODUCTION.ENTRY_FILE)
    }
  }

  /**
   * Register application event handlers
   * Including:
   * - Window close event
   * - Application activation event (macOS)
   * - Developer tool shortcuts
   */
  private registerApplicationEvents(): void {
    // Handle window close event
    app.on('window-all-closed', () => {
      this.window = null
      if (!IS_MAC) {
        app.quit()
      }
    })

    // Handle application activation event (macOS)
    app.on('activate', async () => {
      if (!this.window) {
        await this.createWindow()
      }
    })

    // Register developer tool shortcuts
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      if (this.window) {
        this.window.webContents.toggleDevTools()
      }
    })
  }
}

// Start application instance
const mainApp = new MainApp()
mainApp.init().catch(console.error)
