/**
 * 全局类型声明
 */

/** 扩展 Window 接口 */
interface Window {
  /** Node.js require 函数 */
  require: (module: string) => any
}

/** 扩展 Electron 模块声明 */
declare module 'electron' {
  /** IPC 渲染进程接口 */
  export interface IpcRenderer {
    /** 调用主进程方法 */
    invoke(channel: string, ...args: any[]): Promise<any>
  }
}
