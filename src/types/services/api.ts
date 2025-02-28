/**
 * API 服务相关的类型定义
 */

import { ChatMessage } from '../models/message'
import { FunctionDefinition } from './functions'

/** API 提供商类型 */
export type APIProvider = 'openrouter' | 'siliconflow'

/** API 配置接口 */
export interface APIConfig {
  /** API 提供商 */
  provider: APIProvider
  /** API 密钥映射 */
  apiKeys: Record<APIProvider, string>
  /** 每个提供商选中的模型 */
  selectedModels: Record<APIProvider, string>
}

/** 提供商配置接口 */
export interface ProviderConfig {
  /** 提供商名称 */
  name: string
  /** API 端点 */
  endpoint: string
  /** 支持的模型列表 */
  supportedModels: string[]
  /** 默认请求头 */
  defaultHeaders: Record<string, string>
}

/** 聊天补全参数接口 */
export interface ChatCompletionParams {
  /** 模型名称 */
  model?: string
  /** 消息历史列表 */
  messages: ChatMessage[]
  /** 是否使用流式传输 */
  stream?: boolean
  /** 流式传输的回调函数 */
  onChunk?: (chunk: string, done: boolean) => void
  /** 取消信号 */
  signal?: AbortSignal
  /** 温度参数 */
  temperature?: number
  /** 最大token数 */
  maxTokens?: number
  /** 函数定义列表 */
  tools?: FunctionDefinition[]
  /** 函数调用策略 */
  tool_choice?: 'auto' | 'none' | { name: string }
}

/** API 响应接口 */
export interface APIResponse {
  /** 选择结果 */
  choices: {
    /** 消息内容 */
    message?: {
      /** 角色 */
      role: string
      /** 内容 */
      content: string
    }
    /** 增量内容 */
    delta?: {
      /** 内容 */
      content: string
    }
  }[]
  /** 模型使用情况 */
  usage?: {
    /** 提示token数 */
    prompt_tokens: number
    /** 补全token数 */
    completion_tokens: number
    /** 总token数 */
    total_tokens: number
  }
}

/** API 错误类 */
export class APIError extends Error {
  type: 'error' | 'abort' | 'unknown'

  constructor({
    message,
    type = 'error'
  }: {
    message: string
    type?: 'error' | 'abort' | 'unknown'
  }) {
    super(message)
    this.type = type
    this.name = 'APIError'
  }

  /** 判断是否为取消错误 */
  isAbort(): boolean {
    return this.type === 'abort'
  }
}
