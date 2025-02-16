/**
 * api.ts
 * API 相关的类型定义文件
 * 
 * 这个文件包含了所有与 API 交互相关的类型定义：
 * - APIProvider: API 提供商类型
 * - APIConfig: API 配置接口
 * - Model: AI 模型接口
 * - ProviderConfig: 提供商配置接口
 * 
 * 这些类型定义被其他模块使用，用于确保类型安全和提供代码提示
 */

/**
 * API 提供商类型
 * 目前支持 OpenRouter 和 OpenAI 两种提供商
 */
export type APIProvider = 'openrouter' | 'openai';

/**
 * AI 模型接口
 * 定义了模型的基本信息
 */
export interface Model {
  /** 模型的唯一标识符 */
  id: string;
  /** 模型的显示名称 */
  name: string;
  /** 模型的描述信息 */
  description: string;
}

/**
 * API 配置接口
 * 包含了调用 API 所需的所有配置信息
 */
export interface APIConfig {
  /** API 提供商 */
  provider: APIProvider;
  /** API 密钥 */
  apiKey: string;
  /** 选中的模型 ID */
  selectedModel: string;
}

/**
 * 提供商配置接口
 * 定义了每个 API 提供商的特定配置
 */
export interface ProviderConfig {
  /** 提供商名称 */
  name: string;
  /** 提供商显示标签 */
  label: string;
  /** 获取模型列表的 API 地址 */
  modelsUrl: string;
}

/**
 * API 请求选项
 * 定义了 API 请求的可选参数
 */
export interface APIRequestOptions {
  /** 最大返回的 token 数量 */
  maxTokens?: number;
  /** 响应的温度系数 */
  temperature?: number;
  /** 是否流式返回响应 */
  stream?: boolean;
  /** 请求的信号 */
  signal?: AbortSignal;
}

/**
 * API 响应消息
 * 定义了 API 响应的消息结构
 */
export interface APIResponseMessage {
  /** 消息角色 */
  role: 'assistant' | 'user';
  /** 消息内容 */
  content: string;
  /** 消息时间戳 */
  timestamp?: number;
}

/**
 * 工具类型：提取提供商的模型 ID
 * 根据提供商类型返回模型 ID 的类型
 */
export type ProviderModelId<P extends APIProvider> = 
  P extends 'openrouter' ? `${string}/${string}` : string;

/**
 * 工具类型：API 错误响应
 * 定义了 API 错误响应的结构
 */
export interface APIErrorResponse {
  /** 错误信息 */
  error: {
    /** 错误消息 */
    message: string;
    /** 错误类型 */
    type?: string;
    /** 错误代码 */
    code?: string;
    /** 错误参数 */
    param?: string;
  };
  /** 状态码 */
  status: number;
  /** API 提供商 */
  provider: APIProvider;
}

/**
 * 工具类型：确保配置完整性
 * 确保 API 配置的所有属性都被定义
 */
export type CompleteAPIConfig = Required<APIConfig>;

/**
 * 工具类型：部分配置更新
 * 允许更新 API 配置的部分属性
 */
export type PartialAPIConfig = Partial<APIConfig> & Pick<APIConfig, 'provider'>;

/**
 * 工具类型：模型过滤器
 * 定义了模型过滤的选项
 */
export interface ModelFilter {
  /** 提供商过滤 */
  provider?: APIProvider;
  /** 最小 token 数量过滤 */
  minTokens?: number;
  /** 最大价格过滤 */
  maxPrice?: number;
  /** 包含模式过滤 */
  includePattern?: RegExp;
  /** 排除模式过滤 */
  excludePattern?: RegExp;
}
