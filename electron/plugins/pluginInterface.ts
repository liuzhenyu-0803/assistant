/**
 * 插件系统接口定义
 * 定义了插件的基本结构和行为
 */

/**
 * 插件接口
 * 所有插件必须实现这个接口
 */
export interface Plugin {
  /**
   * 获取插件信息
   */
  getInfo(): PluginInfo;
  
  /**
   * 插件初始化方法
   * 在插件被加载时调用
   */
  initialize(): Promise<void>;
  
  /**
   * 插件销毁方法
   * 在插件被卸载时调用
   */
  destroy(): Promise<void>;
}

/**
 * 插件信息接口
 * 描述插件的基本信息
 */
export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
}

/**
 * 工具插件接口
 * 扩展基本插件接口，专门用于提供工具功能的插件
 */
export interface ToolPlugin extends Plugin {
  /**
   * 获取此插件提供的所有工具
   */
  getTools(): ToolDefinition[];
}

/**
 * 工具定义接口
 * 描述工具的基本信息和执行方法
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  
  /**
   * 执行工具的方法
   * @param params 工具参数
   */
  execute(params: any): Promise<ToolResult>;
}

/**
 * 工具参数接口
 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required: boolean;
}

/**
 * 工具执行结果接口
 */
export interface ToolResult {
  success: boolean;
  error?: string;
  data?: any;
}
