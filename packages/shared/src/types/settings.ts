export interface ModelProvider {
  name: string;
  baseURL: string;
  apiKey?: string;
  models: string[];
}

export interface ModelConfig {
  providerName: string;
  apiKey: string;
  model: string;
}

export interface Settings {
  modelProviders: ModelProvider[];
  modelConfigs: ModelConfig[];
  activeModelConfigId: string;
}
