/**
 * 应用程序配置
 */

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { BrowserWindowConstructorOptions } from 'electron'

// 基础路径配置
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ROOT = path.join(__dirname, '..')

// 环境配置
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_MAC = process.platform === 'darwin'

export const APP_CONFIG = {
  // 窗口配置
  WINDOW: {
    title: 'AI助手',
    show: false,
    width: 900,
    height: 800,
    minWidth: 700,
    minHeight: 800,
    autoHideMenuBar: true,
    icon: IS_DEV 
      ? path.join(APP_ROOT, 'public/assistant.svg')
      : path.join(APP_ROOT, 'resources/icons/assistant.svg'),
    webPreferences: {
      preload: path.join(APP_ROOT, 'dist-electron/preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  } satisfies BrowserWindowConstructorOptions,

  // 开发环境配置
  DEV: {
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
  },

  // 路径配置
  PATHS: {
    DIST: path.join(APP_ROOT, 'dist/index.html'),
  }
}
