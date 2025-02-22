/**
 * 全局类型声明
 */

declare global {
  /** 扩展 Window 接口 */
  interface Window {
    /** Node.js require 函数 */
    require: (module: string) => any
  }
}

/** 扩展 Electron 模块声明 */
declare module 'electron' {
  namespace IpcRenderer {
    /** 调用主进程方法 */
    interface InvokeOptions {
      channel: string
      args: any[]
    }
    function invoke(options: InvokeOptions): Promise<any>
  }
}

// 将文件标记为模块
export {}
