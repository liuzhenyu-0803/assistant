import { APIConfig, APIProvider, APIValidationResponse, ProviderConfig } from '../types/api';

/**
 * API提供商的配置信息
 * 包含每个提供商的名称、标签、验证URL和模型URL
 */
const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  openrouter: {
    name: 'openrouter',
    label: 'OpenRouter',
    validateUrl: 'https://openrouter.ai/api/v1/chat/completions', // OpenRouter使用chat completion接口验证
    modelsUrl: 'https://openrouter.ai/api/v1/models'             // 获取可用模型列表的接口
  },
  siliconflow: {
    name: 'siliconflow',
    label: 'SiliconFlow',
    validateUrl: 'https://api.siliconflow.com/v1/auth/validate', // SiliconFlow专用的验证接口
    modelsUrl: 'https://api.siliconflow.com/v1/models'          // 获取可用模型列表的接口
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
 * 验证API密钥的有效性并获取可用模型列表
 * @param config - API配置信息，包含提供商和API密钥
 * @returns Promise<APIValidationResponse> - 验证结果，包含是否有效、错误信息和可用模型列表
 */
export const validateAPIKey = async (config: APIConfig): Promise<APIValidationResponse> => {
  try {
    const providerConfig = PROVIDER_CONFIGS[config.provider];
    
    // OpenRouter使用特殊的验证逻辑
    if (config.provider === 'openrouter') {
      const response = await fetch(providerConfig.validateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,  // OpenRouter要求提供来源网站
          'X-Title': 'AI Assistant'                // OpenRouter要求提供应用名称
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo',          // 使用最基础的模型
          messages: [{ role: 'user', content: 'Hi' }], // 最简单的测试消息
          max_tokens: 1                            // 限制token数量，节省资源
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Invalid API key: ${response.status} ${errorText}`);
      }
    } else {
      // 其他提供商使用标准的验证逻辑
      const response = await fetch(providerConfig.validateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ key: config.apiKey }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Invalid API key: ${response.status} ${errorText}`);
      }
    }

    // 获取提供商支持的模型列表
    const modelsResponse = await fetch(providerConfig.modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    if (!modelsResponse.ok) {
      const errorText = await modelsResponse.text();
      throw new Error(`Failed to fetch models: ${modelsResponse.status} ${errorText}`);
    }
    const models = await modelsResponse.json();

    // 返回验证成功的结果
    return {
      isValid: true,
      models: models.data.map((model: any) => model.id)
    };
  } catch (error) {
    // 返回验证失败的结果
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
