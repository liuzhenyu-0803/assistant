/**
 * API 服务相关的类型定义
 */

import { Model } from '../models/model'
import { ChatMessage } from '../models/message'

/** API 提供商类型 */
export type APIProvider = 'openrouter'

/** API 配置接口 */
export interface APIConfig {
  /** API 提供商 */
  provider: APIProvider
  /** API 密钥 */
  apiKey: string
  /** 选中的模型 */
  selectedModel: string
}

/** 提供商配置接口 */
export interface ProviderConfig {
  /** 提供商名称 */
  name: string
  /** API 端点 */
  endpoint: string
  /** 模型列表端点 */
  modelsUrl: string
  /** 支持的模型列表 */
  supportedModels?: Model[]
}

/** 聊天补全参数接口 */
export interface ChatCompletionParams {
  /** 模型名称 */
  model: string
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
  /** 错误类型 */
  type: 'error' | 'abort';

  constructor(message: string, type: 'error' | 'abort' = 'error') {
    super(message);
    this.type = type;
    this.name = 'APIError';
  }

  /** 判断是否为取消错误 */
  isAbort(): boolean {
    return this.type === 'abort';
  }
}
