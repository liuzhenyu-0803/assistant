import { APIConfig, APIProvider, APIValidationResponse, ProviderConfig, Model } from '../types/api';

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
 * 包含每个提供商的名称、标签、验证URL和模型URL
 */
const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  openrouter: {
    name: 'openrouter',
    label: 'OpenRouter',
    validateUrl: 'https://openrouter.ai/api/v1/chat/completions',
    modelsUrl: 'https://openrouter.ai/api/v1/models'
  },
  openai: {
    name: 'openai',
    label: 'OpenAI',
    validateUrl: 'https://api.openai.com/v1/chat/completions',
    modelsUrl: 'https://api.openai.com/v1/models'
  }
};

/**
 * 获取指定提供商的配置信息
 * @param provider - API提供商名称
 * @returns 提供商的配置信息
 */
export const getProviderConfig = (provider: APIProvider): ProviderConfig => {
  return PROVIDER_CONFIGS[provider];
};

/**
 * 获取请求头
 * @param config - API配置信息
 * @returns 请求头对象
 */
const getHeaders = (config: APIConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json'
  };

  if (config.provider === 'openrouter') {
    headers['HTTP-Referer'] = window.location.origin;
    headers['X-Title'] = 'AI Assistant';
  }

  return headers;
};

/**
 * 带重试的 API 请求
 * @param url - 请求 URL
 * @param options - 请求选项
 * @param retries - 重试次数
 * @returns Promise<Response>
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries: number = 3
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(
          `API 请求失败: ${errorText}`,
          response.status
        );
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('未知错误');
      
      if (i === retries - 1) break;
      
      // 指数退避重试
      await new Promise(resolve => 
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }

  throw lastError;
};

/**
 * 验证API密钥的有效性并获取可用模型列表
 * @param config - API配置信息，包含提供商和API密钥
 * @returns Promise<APIValidationResponse> - 验证结果，包含是否有效、错误信息和可用模型列表
 */
export const validateAPIKey = async (config: APIConfig): Promise<APIValidationResponse> => {
  try {
    const providerConfig = PROVIDER_CONFIGS[config.provider];
    const headers = getHeaders(config);
    
    // 验证 API Key
    const validateBody = {
      model: config.provider === 'openrouter' ? 'openai/gpt-3.5-turbo' : 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 1
    };

    await fetchWithRetry(
      providerConfig.validateUrl,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(validateBody)
      }
    );

    // 获取提供商支持的模型列表
    const modelsResponse = await fetchWithRetry(
      providerConfig.modelsUrl,
      {
        method: 'GET',
        headers
      }
    );

    const modelsData = await modelsResponse.json();
    let models: Model[];

    // 根据不同的 API 提供商处理模型数据
    if (config.provider === 'openrouter') {
      models = modelsData.data.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter'
      }));
    } else {
      // OpenAI 的模型数据结构不同
      models = modelsData.data
        .filter((model: any) => 
          model.id.startsWith('gpt-') && !model.id.includes('instruct')
        )
        .map((model: any) => ({
          id: model.id,
          name: model.id,
          provider: 'openai'
        }));
    }

    return {
      isValid: true,
      models
    };
  } catch (error) {
    const apiError = error instanceof APIError ? error : new APIError(
      error instanceof Error ? error.message : '未知错误',
      undefined,
      config.provider
    );

    return {
      isValid: false,
      error: `${apiError.message}${apiError.status ? ` (状态码: ${apiError.status})` : ''}`
    };
  }
};
