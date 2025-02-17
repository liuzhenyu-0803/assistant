/**
 * config.ts
 * 应用配置管理模块
 * 
 * 功能：
 * - 管理应用配置的读写
 * - 提供配置文件的默认值
 * - 验证配置数据格式
 * - 处理配置迁移和升级
 * - 确保配置文件安全性
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-17
 */

import { app, nativeImage } from 'electron'
import path from 'node:path'
import { BrowserWindowConstructorOptions } from 'electron'

/**
 * 应用程序根目录路径
 * 用于解析资源文件和配置文件的路径
 */
const APP_ROOT = app.getAppPath()

/**
 * 环境变量标识
 */
export const IS_DEV = process.env.NODE_ENV === 'development'
export const IS_MAC = process.platform === 'darwin'

/**
 * 应用程序配置对象
 * 包含窗口配置、开发和生产环境的特定配置
 */
export const APP_CONFIG = {
  /**
   * 主窗口配置
   * 定义窗口的尺寸、行为和安全选项
   */
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
      preload: path.join(APP_ROOT, 'dist-electron/preload.mjs'),
      nodeIntegration: false,  // 禁用Node集成，提高安全性
      contextIsolation: true,  // 启用上下文隔离，防止原型污染
    }
  } satisfies BrowserWindowConstructorOptions,

  /**
   * 开发环境特定配置
   */
  DEVELOPMENT: {
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL,
  },

  /**
   * 生产环境特定配置
   */
  PRODUCTION: {
    ENTRY_FILE: path.join(APP_ROOT, 'dist/index.html'),
  }
}