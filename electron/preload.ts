import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  readConfig: (configPath: string) => ipcRenderer.invoke('config:read', configPath),
  writeConfig: (configPath: string, data: string) => ipcRenderer.invoke('config:write', configPath, data)
})

// 声明类型
declare global {
  interface Window {
    electronAPI: {
      readConfig: (configPath: string) => Promise<any>;
      writeConfig: (configPath: string, data: string) => Promise<any>;
    }
  }
}
