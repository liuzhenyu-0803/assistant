import type { Settings } from '@assistant/shared';
import { jsonStore } from '../storage/json-store.js';
import { SETTINGS_FILE } from '../storage/paths.js';

const DEFAULT_SETTINGS: Settings = {
  baseURL: '',
  apiKey: '',
  model: '',
  contextWindowSize: 128000,
};

export const settingsService = {
  async getSettings(): Promise<Settings> {
    const data = await jsonStore.read<Settings>(SETTINGS_FILE);
    return data ?? { ...DEFAULT_SETTINGS };
  },

  async updateSettings(settings: Settings): Promise<void> {
    await jsonStore.write(SETTINGS_FILE, settings);
  },

  async getMaskedSettings(): Promise<Settings> {
    const settings = await this.getSettings();
    return {
      ...settings,
      apiKey: maskApiKey(settings.apiKey),
    };
  },

  validateSettings(settings: Settings): string | null {
    if (!settings.baseURL) return 'baseURL is required';
    if (!settings.apiKey) return 'apiKey is required';
    if (!settings.model) return 'model is required';
    return null;
  },
};

function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 7) return '***';
  return key.slice(0, 3) + '***' + key.slice(-4);
}
