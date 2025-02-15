export type APIProvider = 'openrouter' | 'siliconflow';

export interface APIConfig {
  provider: APIProvider;
  apiKey: string;
  selectedModel?: string;
}

export interface APIValidationResponse {
  isValid: boolean;
  models?: string[];
  error?: string;
}

export interface ProviderConfig {
  name: APIProvider;
  label: string;
  validateUrl: string;
  modelsUrl: string;
}
