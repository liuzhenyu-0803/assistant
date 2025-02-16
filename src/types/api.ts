/**
 * API 提供商类型
 */
export type APIProvider = 'openrouter' | 'openai';

/**
 * 模型类型
 */
export interface Model {
  id: string;
  name: string;
  provider: APIProvider;
  maxTokens?: number;
  pricePerToken?: number;
}

/**
 * API 配置接口
 */
export interface APIConfig {
  provider: APIProvider;
  apiKey: string;
  selectedModel?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * API 验证响应接口
 */
export interface APIValidationResponse {
  isValid: boolean;
  models?: Model[];
  error?: string;
  timestamp?: number;
}

/**
 * 提供商配置接口
 */
export interface ProviderConfig {
  name: APIProvider;
  label: string;
  validateUrl: string;
  modelsUrl: string;
  maxTokensLimit?: number;
  defaultModel?: string;
}

/**
 * API 请求选项
 */
export interface APIRequestOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  signal?: AbortSignal;
}

/**
 * API 响应消息
 */
export interface APIResponseMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp?: number;
}

/**
 * 工具类型：提取提供商的模型 ID
 */
export type ProviderModelId<P extends APIProvider> = 
  P extends 'openrouter' ? `${string}/${string}` : string;

/**
 * 工具类型：API 错误响应
 */
export interface APIErrorResponse {
  error: {
    message: string;
    type?: string;
    code?: string;
    param?: string;
  };
  status: number;
  provider: APIProvider;
}

/**
 * 工具类型：确保配置完整性
 */
export type CompleteAPIConfig = Required<APIConfig>;

/**
 * 工具类型：部分配置更新
 */
export type PartialAPIConfig = Partial<APIConfig> & Pick<APIConfig, 'provider'>;

/**
 * 工具类型：模型过滤器
 */
export interface ModelFilter {
  provider?: APIProvider;
  minTokens?: number;
  maxPrice?: number;
  includePattern?: RegExp;
  excludePattern?: RegExp;
}
