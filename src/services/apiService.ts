/**
 * apiService.ts
 * API 服务实现文件
 * 
 * 这个文件实现了与 AI 模型 API 交互的核心功能：
 * - 获取可用的模型列表
 * - 处理 API 请求头
 * - 管理不同提供商的配置
 * 
 * 主要包含以下功能：
 * 1. 提供商配置管理
 * 2. 请求头处理
 * 3. 模型列表获取
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-16
 */

import { APIConfig, APIProvider, Model, ProviderConfig } from '../types/api';

/**
 * API 错误类型
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly provider?: APIProvider
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * API提供商的配置信息
 * 包含每个提供商的名称、标签和模型URL
 * 
 * @example
 * {
 *   openrouter: {
 *     name: 'openrouter',
 *     label: 'OpenRouter',
 *     modelsUrl: 'https://openrouter.ai/api/v1/models'
 *   }
 * }
 */
const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  openrouter: {
    name: 'openrouter',
    label: 'OpenRouter',
    modelsUrl: 'https://openrouter.ai/api/v1/models'
  },
  openai: {
    name: 'openai',
    label: 'OpenAI',
    modelsUrl: 'https://api.openai.com/v1/models'
  }
};

/**
 * 获取指定提供商的配置信息
 * 
 * @param provider - API提供商名称
 * @returns 提供商的配置信息
 * 
 * @example
 * const config = getProviderConfig('openrouter');
 * console.log(config.label); // 'OpenRouter'
 */
export const getProviderConfig = (provider: APIProvider): ProviderConfig => {
  return PROVIDER_CONFIGS[provider];
};

/**
 * 获取请求头
 * 根据不同的提供商生成对应的请求头
 * 
 * @param config - API配置信息
 * @returns 请求头对象
 * 
 * @example
 * const headers = getHeaders({
 *   provider: 'openrouter',
 *   apiKey: 'xxx',
 *   selectedModel: 'gpt-3.5-turbo'
 * });
 */
const getHeaders = (config: APIConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json'
  };

  // OpenRouter 需要额外的请求头
  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'AI Assistant';
  }

  return headers;
};

/**
 * 获取模型列表
 * 从 API 提供商获取可用的模型列表
 * 
 * @param provider - API 提供商
 * @returns Promise<Model[]> - 模型列表
 * 
 * @example
 * const models = await getModelsList('openrouter');
 * console.log(models); // [{id: 'gpt-3.5-turbo', name: 'GPT-3.5'}, ...]
 * 
 * @throws {Error} 当获取模型列表失败时抛出错误
 */
export const getModelsList = async (provider: APIProvider): Promise<Model[]> => {
  const providerConfig = getProviderConfig(provider);
  
  try {
    // 发起请求获取模型列表
    const response = await fetch(providerConfig.modelsUrl);
    if (!response.ok) {
      throw new Error(`获取模型列表失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 根据不同的提供商处理返回的数据
    if (provider === 'openrouter') {
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || ''
      }));
    } else {
      // OpenAI 的模型处理逻辑
      return data.data
        .filter((model: any) => model.id.startsWith('gpt'))
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          description: ''
        }));
    }
  } catch (error) {
    console.error('获取模型列表失败:', error);
    return [];
  }
};
