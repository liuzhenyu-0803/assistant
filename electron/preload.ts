import { contextBridge, ipcRenderer } from 'electron'

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  readConfig: (configPath: string) => ipcRenderer.invoke('read-config', configPath),
  writeConfig: (configPath: string, data: string) => ipcRenderer.invoke('write-config', configPath, data)
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
