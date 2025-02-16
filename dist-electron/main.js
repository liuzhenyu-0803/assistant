var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, app, Menu, BrowserWindow, globalShortcut } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, "..");
const IS_DEV = process.env.NODE_ENV === "development";
const IS_MAC = process.platform === "darwin";
const APP_CONFIG = {
  // 窗口配置
  WINDOW: {
    title: "AI助手",
    show: false,
    width: 900,
    height: 800,
    minWidth: 700,
    minHeight: 800,
    autoHideMenuBar: true,
    icon: IS_DEV ? path.join(APP_ROOT, "public/assistant.svg") : path.join(APP_ROOT, "resources/icons/assistant.svg"),
    webPreferences: {
      preload: path.join(APP_ROOT, "dist-electron/preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  },
  // 开发环境配置
  DEV: {
    VITE_DEV_SERVER_URL: process.env.VITE_DEV_SERVER_URL
  },
  // 路径配置
  PATHS: {
    DIST: path.join(APP_ROOT, "dist/index.html")
  }
};
class IPCHandler {
  /**
   * 初始化所有IPC处理程序
   */
  static init() {
    IPCHandler.setupConfigHandlers();
    console.log("IPC handlers initialized");
  }
  /**
   * 设置配置文件相关的处理程序
   */
  static setupConfigHandlers() {
    ipcMain.handle("read-config", async (_, configPath) => {
      try {
        const fullPath = IPCHandler.getConfigPath(configPath);
        console.log("Reading config from:", fullPath);
        await IPCHandler.ensureConfigFile(fullPath);
        const data = await fs.readFile(fullPath, "utf-8");
        console.log("Config data read:", data);
        return { success: true, data };
      } catch (error) {
        console.error("Error reading config:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
    ipcMain.handle("write-config", async (_, configPath, data) => {
      try {
        const fullPath = IPCHandler.getConfigPath(configPath);
        console.log("Writing config to:", fullPath);
        console.log("Config data to write:", data);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, data, "utf-8");
        console.log("Config written successfully");
        const written = await fs.readFile(fullPath, "utf-8");
        if (written === data) {
          console.log("Config write verified");
          return { success: true };
        } else {
          throw new Error("Config verification failed");
        }
      } catch (error) {
        console.error("Error writing config:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }
  /**
   * 获取配置文件的完整路径
   */
  static getConfigPath(configPath) {
    const userDataPath = app.getPath("userData");
    console.log("User data path:", userDataPath);
    const fullPath = path.join(userDataPath, configPath);
    console.log("Full config path:", fullPath);
    return fullPath;
  }
  /**
   * 确保配置文件存在，如果不存在则创建
   */
  static async ensureConfigFile(fullPath) {
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      try {
        await fs.access(fullPath);
      } catch {
        const defaultConfig = {
          apiConfig: {
            provider: "openrouter",
            apiKey: "",
            selectedModel: "openai/gpt-3.5-turbo"
          }
        };
        await fs.writeFile(fullPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
        console.log("Created default config file");
      }
    } catch (error) {
      console.error("Error ensuring config file:", error);
      throw error;
    }
  }
}
class MainApp {
  constructor() {
    __publicField(this, "mainWindow", null);
  }
  /**
   * 初始化应用程序
   */
  async init() {
    try {
      await app.whenReady();
      Menu.setApplicationMenu(null);
      IPCHandler.init();
      await this.createWindow();
      this.setupAppEvents();
    } catch (error) {
      console.error("Failed to initialize application:", error);
      app.quit();
    }
  }
  /**
   * 创建主窗口
   */
  async createWindow() {
    const window = new BrowserWindow(APP_CONFIG.WINDOW);
    this.mainWindow = window;
    window.once("ready-to-show", () => {
      window.show();
      if (APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
        window.webContents.openDevTools();
      }
    });
    if (APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
      await window.loadURL(APP_CONFIG.DEV.VITE_DEV_SERVER_URL);
    } else {
      await window.loadFile(APP_CONFIG.PATHS.DIST);
    }
  }
  /**
   * 设置应用事件
   */
  setupAppEvents() {
    app.on("window-all-closed", () => {
      this.mainWindow = null;
      if (!IS_MAC) {
        app.quit();
      }
    });
    app.on("activate", async () => {
      if (!this.mainWindow) {
        await this.createWindow();
      }
    });
    if (APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
      globalShortcut.register("CommandOrControl+Shift+I", () => {
        if (this.mainWindow) {
          this.mainWindow.webContents.toggleDevTools();
        }
      });
    }
  }
}
const mainApp = new MainApp();
mainApp.init().catch(console.error);
