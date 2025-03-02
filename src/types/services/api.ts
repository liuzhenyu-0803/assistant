/**
 * API 服务相关的类型定义
 * 
 * 包含所有与API通信相关的类型定义：
 * - API提供商和配置
 * - 请求参数和选项
 * - 响应结构和数据模型
 * - 工具和函数调用
 * 
 * @module types/services/api
 * @version 1.0.0
 * @lastModified 2025-03-02
 */

import { ChatMessage } from './message'

//======================================
// API服务基础配置
//======================================

/**
 * API 提供商类型
 * 定义支持的AI服务提供商
 */
export type APIProvider = 'openrouter' | 'siliconflow'

/**
 * API 配置接口
 * 定义应用的API设置
 */
export interface APIConfig {
  /**
   * 当前选择的API提供商
   * 用于确定请求发送到哪个服务
   */
  provider: APIProvider
  
  /**
   * API 密钥映射
   * 每个提供商对应的API访问密钥
   */
  apiKeys: Record<APIProvider, string>
  
  /**
   * 每个提供商选中的模型
   * 用于不同提供商的默认模型设置
   */
  selectedModels: Record<APIProvider, string>
}

/**
 * 提供商配置接口
 * 定义特定API提供商的详细配置
 */
export interface ProviderConfig {
  /**
   * 提供商显示名称
   * 用于UI界面展示
   */
  name: string
  
  /**
   * API 请求端点URL
   * 用于构建请求地址
   */
  endpoint: string
  
  /**
   * 该提供商支持的模型列表
   * 用于模型选择下拉框
   */
  supportedModels: string[]
  
  /**
   * 默认请求头
   * 每个请求都会包含的HTTP头部
   */
  defaultHeaders: Record<string, string>
}

//======================================
// API请求参数
//======================================

/**
 * 聊天补全参数接口
 * 定义发送到AI服务的请求参数
 */
export interface ChatCompletionParams {
  /**
   * 模型名称
   * 指定使用的AI模型，如不提供则使用提供商默认模型
   */
  model?: string
  
  /**
   * 消息历史列表
   * 包含对话的上下文和当前问题
   */
  messages: ChatMessage[]
  
  /**
   * 是否使用流式传输
   * 为true时启用增量响应，适用于实时显示生成内容
   * @default true
   */
  stream?: boolean
  
  /**
   * 流式传输的回调函数
   * 当接收到新的内容块时被调用
   * @param chunk 接收到的文本块
   * @param done 是否完成生成
   */
  onChunk?: (chunk: string, done: boolean) => void
  
  /**
   * 取消信号
   * 用于中止请求的AbortSignal对象
   */
  signal?: AbortSignal
  
  /**
   * 温度参数
   * 控制输出的随机性，范围0-2，值越高回复越多样化
   * @default 0.7
   */
  temperature?: number
  
  /**
   * 最大生成token数量
   * 限制响应的最大长度
   */
  maxTokens?: number
}
