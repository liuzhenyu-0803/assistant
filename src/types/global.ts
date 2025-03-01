/**
 * 全局类型声明
 * 
 * 包含：
 * - 对全局Window对象的扩展
 * - 对Electron模块的类型声明扩展
 * 
 * @module types/global
 * @version 1.0.0
 * @lastModified 2025-03-01
 */

declare global {
  /**
   * 扩展Window接口
   * 添加Electron环境中的Node.js集成特性
   */
  interface Window {
    /** Node.js的require函数，用于加载原生模块 */
    require: (module: string) => any
  }
}

/**
 * 扩展Electron模块声明
 * 补充官方类型定义中缺少的部分
 */
declare module 'electron' {
  namespace IpcRenderer {
    /**
     * IPC调用选项接口
     * 用于进程间通信的参数传递
     */
    interface InvokeOptions {
      /** 通信频道名称 */
      channel: string
      /** 传递的参数数组 */
      args: any[]
    }
    
    /**
     * 调用主进程方法
     * @param options 调用选项，包含频道和参数
     * @returns 返回主进程响应的Promise
     */
    function invoke(options: InvokeOptions): Promise<any>
  }
}

// 将文件标记为模块以启用ES模块系统
export {}
