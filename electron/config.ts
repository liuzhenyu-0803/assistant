/**
 * Electron应用程序配置文件
 * 集中管理所有的配置项，包括窗口配置、环境配置和路径配置等
 */

import { app, nativeImage } from 'electron'
import path from 'node:path'
import { BrowserWindowConstructorOptions } from 'electron'

// 获取应用根目录路径
const APP_ROOT = app.getAppPath()

// 环境标识
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_MAC = process.platform === 'darwin'

export const APP_CONFIG = {
  // 窗口配置
  WINDOW: {
    title: 'Assistant',
    show: false,
    width: 900,
    height: 800,
    minWidth: 700,
    minHeight: 800,
    autoHideMenuBar: true,
    icon: nativeImage.createFromPath(path.join(APP_ROOT, 'resources/icons/logo.ico')),

    webPreferences: {
      // preload脚本路径 - 由vite-plugin-electron自动生成
      preload: path.join(APP_ROOT, 'dist-electron/preload.mjs'),
      nodeIntegration: false, 
      contextIsolation: true, 
    }
  } satisfies BrowserWindowConstructorOptions,

  // 开发环境配置
  DEVELOPMENT: {
    // Vite开发服务器地址
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
  },

  // 生产环境配置
  PRODUCTION: {
    ENTRY_FILE: path.join(APP_ROOT, 'dist/index.html'),
  }
}