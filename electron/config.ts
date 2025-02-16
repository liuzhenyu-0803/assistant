/**
 * Electron应用程序配置文件
 * 集中管理所有的配置项，包括窗口配置、环境配置和路径配置等
 */

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { BrowserWindowConstructorOptions } from 'electron'

// 获取应用根目录路径
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '..')

// 环境标识
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_MAC = process.platform === 'darwin'

export const APP_CONFIG = {
  // 窗口配置
  WINDOW: {
    title: 'AI助手',
    show: false, // 初始化完成前隐藏窗口
    width: 900,
    height: 800,
    minWidth: 700,
    minHeight: 800,
    autoHideMenuBar: true,
    // 窗口图标路径
    icon: path.join(APP_ROOT, 'resources/icons/assistant.svg'),
    webPreferences: {
      // preload脚本路径 - 由vite-plugin-electron自动生成
      preload: path.join(APP_ROOT, 'dist-electron/preload.mjs'),
      nodeIntegration: false, // 禁用Node集成，提高安全性
      contextIsolation: true, // 启用上下文隔离，提高安全性
    }
  } satisfies BrowserWindowConstructorOptions,

  // 开发环境配置 - 由vite-plugin-electron提供
  DEVELOPMENT: {
    // Vite开发服务器URL，用于开发环境加载页面
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
  },

  // 生产环境配置
  PRODUCTION: {
    // 生产环境下的页面入口文件路径
    ENTRY_FILE: path.join(APP_ROOT, 'dist/index.html'),
  }
}
