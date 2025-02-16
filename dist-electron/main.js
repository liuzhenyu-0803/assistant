var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { BrowserWindow, app, ipcMain } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
const APP_CONFIG = {
  // 窗口配置
  WINDOW: {
    WIDTH: 600,
    HEIGHT: 700,
    MIN_WIDTH: 500,
    MIN_HEIGHT: 700
  },
  // 开发环境配置
  DEV: {
    VITE_DEV_SERVER_URL: process.env["VITE_DEV_SERVER_URL"]
  }
};
class MainApp {
  constructor() {
    __publicField(this, "mainWindow", null);
    __publicField(this, "isMac", process.platform === "darwin");
    __publicField(this, "isDevMode", process.env.NODE_ENV === "development");
    __publicField(this, "appRoot");
    createRequire(import.meta.url);
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    this.appRoot = path.join(__dirname, "..");
    process.env.APP_ROOT = this.appRoot;
    process.env.VITE_PUBLIC = APP_CONFIG.DEV.VITE_DEV_SERVER_URL ? path.join(this.appRoot, "public") : path.join(this.appRoot, "dist");
  }
  async createWindow() {
    try {
      this.mainWindow = new BrowserWindow({
        width: APP_CONFIG.WINDOW.WIDTH,
        height: APP_CONFIG.WINDOW.HEIGHT,
        minWidth: APP_CONFIG.WINDOW.MIN_WIDTH,
        minHeight: APP_CONFIG.WINDOW.MIN_HEIGHT,
        frame: true,
        title: "AI助手",
        icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
        webPreferences: {
          preload: path.join(this.appRoot, "dist-electron/preload.mjs"),
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        },
        show: false,
        autoHideMenuBar: true,
        backgroundColor: "#1e1f2b",
        transparent: false,
        roundedCorners: true,
        thickFrame: true,
        vibrancy: "under-window"
      });
      this.setupWindowEvents();
      await this.loadApp();
      this.mainWindow.show();
    } catch (error) {
      console.error("Error creating window:", error);
    }
  }
  setupWindowEvents() {
    if (!this.mainWindow) return;
    this.mainWindow.webContents.on("did-finish-load", () => {
      console.log("Window loaded successfully");
    });
    this.mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    });
    this.mainWindow.webContents.on("before-input-event", (event, input) => {
      var _a;
      if (input.control && input.key.toLowerCase() === "i") {
        (_a = this.mainWindow) == null ? void 0 : _a.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  }
  async loadApp() {
    if (!this.mainWindow) return;
    try {
      if (APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
        console.log("Loading URL:", APP_CONFIG.DEV.VITE_DEV_SERVER_URL);
        await this.mainWindow.loadURL(APP_CONFIG.DEV.VITE_DEV_SERVER_URL);
      } else {
        const indexHtml = path.join(this.appRoot, "dist/index.html");
        console.log("Loading file:", indexHtml);
        await this.mainWindow.loadFile(indexHtml);
      }
    } catch (error) {
      console.error("Error loading app:", error);
    }
  }
  setupAppEvents() {
    app.on("window-all-closed", () => {
      this.mainWindow = null;
      if (!this.isMac) {
        app.quit();
      }
    });
    app.on("activate", async () => {
      if (!this.mainWindow) {
        await this.createWindow();
      }
    });
    app.on("web-contents-created", (_, contents) => {
      contents.on("will-navigate", (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (this.isDevMode && parsedUrl.origin === APP_CONFIG.DEV.VITE_DEV_SERVER_URL) {
          return;
        }
        console.log("Blocked navigation to:", navigationUrl);
        event.preventDefault();
      });
      contents.setWindowOpenHandler(() => {
        return { action: "deny" };
      });
    });
  }
  setupIPC() {
    ipcMain.handle("read-config", async (_, configPath) => {
      try {
        const userDataPath = app.getPath("userData");
        const fullPath = path.join(userDataPath, configPath);
        try {
          await fs.access(fullPath);
        } catch {
          await fs.writeFile(fullPath, JSON.stringify({}, null, 2), "utf-8");
        }
        const data = await fs.readFile(fullPath, "utf-8");
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
        const userDataPath = app.getPath("userData");
        const fullPath = path.join(userDataPath, configPath);
        await fs.writeFile(fullPath, data, "utf-8");
        return { success: true };
      } catch (error) {
        console.error("Error writing config:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    });
  }
  async init() {
    try {
      await app.whenReady();
      this.setupIPC();
      this.setupAppEvents();
      await this.createWindow();
      console.log("Application initialized successfully");
    } catch (error) {
      console.error("Error initializing app:", error);
      app.quit();
    }
  }
}
const mainApp = new MainApp();
mainApp.init().catch(console.error);
