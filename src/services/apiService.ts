import { APIConfig, APIProvider, APIValidationResponse, ProviderConfig } from '../types/api';

const PROVIDER_CONFIGS: Record<APIProvider, ProviderConfig> = {
  openrouter: {
    name: 'openrouter',
    label: 'OpenRouter',
    validateUrl: 'https://openrouter.ai/api/v1/auth/validate',
    modelsUrl: 'https://openrouter.ai/api/v1/models'
  },
  siliconflow: {
    name: 'siliconflow',
    label: 'SiliconFlow',
    validateUrl: 'https://api.siliconflow.com/v1/auth/validate',
    modelsUrl: 'https://api.siliconflow.com/v1/models'
  }
};

export const getProviderConfig = (provider: APIProvider): ProviderConfig => {
  return PROVIDER_CONFIGS[provider];
};

export const validateAPIKey = async (config: APIConfig): Promise<APIValidationResponse> => {
  try {
    const providerConfig = PROVIDER_CONFIGS[config.provider];
    const response = await fetch(providerConfig.validateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Invalid API key');
    }

    const models = await fetch(providerConfig.modelsUrl, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      }
    }).then(res => res.json());

    return {
      isValid: true,
      models: models.data.map((model: any) => model.id)
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};
