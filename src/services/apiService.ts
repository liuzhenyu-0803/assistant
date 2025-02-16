/**
 * apiService.ts
 * API 服务实现文件
 * 
 * 这个文件实现了与 AI 模型 API 交互的核心功能：
 * - 获取可用的模型列表
 * - 管理不同提供商的配置
 * 
 * 主要包含以下功能：
 * 1. 提供商配置管理
 * 2. 模型列表获取
 * 
 * @author AI助手开发团队
 * @lastModified 2025-02-16
 */

/**
 * API 错误类型
 */
export class APIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly provider?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * API提供商配置
 */
const PROVIDER_CONFIGS: Record<string, any> = {
  openrouter: {
    name: 'openrouter',
    label: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
  }
};

/**
 * 获取API提供商配置
 */
export const getProviderConfig = (provider: string): any => {
  return PROVIDER_CONFIGS[provider];
};

/**
 * 获取模型列表
 */
export const getModelsList = async (): Promise<any[]> => {
  const providerConfig = getProviderConfig('openrouter');
  
  try {
    const response = await fetch(`${providerConfig.endpoint}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new APIError('获取模型列表失败', response.status, providerConfig.name);
    }
    
    const data = await response.json();
    
    if (providerConfig.name === 'openrouter') {
      return data.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        description: model.description || ''
      }));
    }
    
    return [];
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('获取模型列表失败', undefined, providerConfig.name);
  }
};
