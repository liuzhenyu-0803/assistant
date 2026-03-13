import type { Settings, ModelProvider, ModelConfig } from '@assistant/shared';
import { jsonStore } from '../storage/json-store.js';
import { SETTINGS_FILE, MODEL_PROVIDERS_FILE } from '../storage/paths.js';

interface LegacySettings {
  baseURL?: string;
  apiKey?: string;
  model?: string;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  providerName: 'DashScope',
  apiKey: '',
  model: 'qwen3.5-plus',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isModelProviderArray(value: unknown): value is ModelProvider[] {
  return Array.isArray(value) && value.every(item => isRecord(item) && 'name' in item && 'baseURL' in item && 'models' in item);
}

function isSettingsShape(value: unknown): value is Settings {
  return (
    isRecord(value) &&
    Array.isArray(value.modelProviders) &&
    Array.isArray(value.modelConfigs) &&
    typeof value.activeModelConfigId === 'string'
  );
}

function isLegacySettingsShape(value: unknown): value is LegacySettings {
  return (
    isRecord(value) &&
    ('baseURL' in value || 'apiKey' in value || 'model' in value) &&
    !('modelProviders' in value) &&
    !('modelConfigs' in value)
  );
}

function migrateLegacySettings(legacy: LegacySettings): Settings {
  return {
    modelProviders: getDefaultModelProviders(),
    modelConfigs: [
      {
        providerName: 'DashScope',
        apiKey: typeof legacy.apiKey === 'string' ? legacy.apiKey : '',
        model: typeof legacy.model === 'string' ? legacy.model : '',
      },
    ],
    activeModelConfigId: 'default',
  };
}

function normalizeSettings(value: unknown): Settings {
  if (isSettingsShape(value)) {
    return {
      modelProviders: value.modelProviders.map((provider) => ({ ...provider })),
      modelConfigs: value.modelConfigs.map((config) => ({ ...config })),
      activeModelConfigId: value.activeModelConfigId,
    };
  }

  if (isLegacySettingsShape(value)) {
    return migrateLegacySettings(value);
  }

  return {
    modelProviders: getDefaultModelProviders(),
    modelConfigs: [{ ...DEFAULT_MODEL_CONFIG }],
    activeModelConfigId: 'DashScope',
  };
}

function getActiveModelConfig(settings: Settings): ModelConfig | null {
  return settings.modelConfigs.find((config) => config.providerName === settings.activeModelConfigId) ?? null;
}

/**
 * 获取默认 Provider 列表（从配置文件读取）
 */
async function loadModelProviders(): Promise<ModelProvider[]> {
  try {
    const data = await jsonStore.read<unknown>(MODEL_PROVIDERS_FILE);
    if (isModelProviderArray(data)) {
      return data.map(p => ({ ...p }));
    }
  } catch {
    // 文件读取失败时返回默认值
  }
  return getDefaultModelProviders();
}

/**
 * 保存 Provider 列表到配置文件
 */
async function saveModelProviders(providers: ModelProvider[]): Promise<void> {
  await jsonStore.write(MODEL_PROVIDERS_FILE, providers);
}

/**
 * 获取硬编码的默认 Provider 列表（作为配置文件不存在时的备选）
 */
function getDefaultModelProviders(): ModelProvider[] {
  return [
    {
      name: 'DashScope',
      baseURL: 'https://coding.dashscope.aliyuncs.com/v1',
      apiKey: '',
      models: ['qwen3.5-plus', 'qwen-max'],
    },
    {
      name: 'OpenRouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: '',
      models: ['google/gemini-2.5-flash-preview-05-20', 'google/gemini-2.5-pro-preview', 'anthropic/claude-sonnet-4'],
    },
    {
      name: 'AiHubMix',
      baseURL: 'https://aihubmix.com/v1',
      apiKey: '',
      models: ['gpt-4.1-mini', 'gpt-4.1'],
    },
  ];
}

export const settingsService = {
  async getSettings(): Promise<Settings> {
    const [data, providers] = await Promise.all([
      jsonStore.read<unknown>(SETTINGS_FILE),
      loadModelProviders(),
    ]);

    if (!data) {
      return {
        modelProviders: providers,
        modelConfigs: [{ ...DEFAULT_MODEL_CONFIG }],
        activeModelConfigId: 'DashScope',
      };
    }

    const normalized = normalizeSettings(data);

    // 始终用 model-providers.json 覆盖，确保 apiKey 等字段以配置文件为准
    normalized.modelProviders = providers;

    if (!isSettingsShape(data)) {
      await jsonStore.write(SETTINGS_FILE, normalized);
    }

    return normalized;
  },

  async updateSettings(settings: Settings): Promise<void> {
    await jsonStore.write(SETTINGS_FILE, settings);
  },

  validateSettings(settings: Settings): string | null {
    if (!Array.isArray(settings.modelProviders) || settings.modelProviders.length === 0) {
      return '至少需要一个 API Provider';
    }

    if (!Array.isArray(settings.modelConfigs) || settings.modelConfigs.length === 0) {
      return '至少需要一个模型配置';
    }

    const providerNames = new Set<string>();
    for (const provider of settings.modelProviders) {
      if (!provider.name) return 'Provider 名称不能为空';
      if (providerNames.has(provider.name)) return 'Provider 名称不能重复';
      providerNames.add(provider.name);
      if (!provider.baseURL) return 'Base URL 不能为空';
      if (!Array.isArray(provider.models) || provider.models.length === 0) return '至少需要一个模型';
    }

    for (const config of settings.modelConfigs) {
      if (!config.providerName) return 'Provider 名称不能为空';
      if (!settings.modelProviders.find((p) => p.name === config.providerName)) {
        return '无效的 Provider 名称';
      }
      if (!config.model) return 'Model 不能为空';
    }

    if (!settings.activeModelConfigId.trim()) {
      return '必须选择当前使用的模型配置';
    }

    return null;
  },

  getActiveModelConfig(settings: Settings): ModelConfig | null {
    return getActiveModelConfig(settings);
  },

  getActiveProvider(settings: Settings): ModelProvider | null {
    const activeConfig = getActiveModelConfig(settings);
    if (!activeConfig) return null;
    return settings.modelProviders.find((p) => p.name === activeConfig.providerName) || null;
  },

  // 新增：管理 Provider 配置
  getModelProviders: loadModelProviders,
  saveModelProviders,
};
