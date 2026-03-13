import { create } from 'zustand';
import type { Settings, ModelProvider, ModelConfig } from '@assistant/shared';
import { fetchSettings, saveSettings } from '../services/settings-api';

interface SettingsStore {
  settings: Settings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (settings: Settings) => Promise<void>;
}

const DEFAULT_MODEL_PROVIDERS: ModelProvider[] = [
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

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  providerName: 'DashScope',
  apiKey: '',
  model: 'qwen3.5-plus',
};

export const DEFAULT_SETTINGS: Settings = {
  modelProviders: [...DEFAULT_MODEL_PROVIDERS],
  modelConfigs: [{ ...DEFAULT_MODEL_CONFIG }],
  activeModelConfigId: 'default',
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  loading: false,
  saving: false,
  error: null,

  async load() {
    set({ loading: true, error: null });
    try {
      const settings = await fetchSettings();
      set({ settings, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      set({ loading: false, error: message });
    }
  },

  async save(settings: Settings) {
    set({ saving: true, error: null });
    try {
      const updated = await saveSettings(settings);
      set({ settings: updated, saving: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings';
      set({ saving: false, error: message });
      throw err;
    }
  },
}));
