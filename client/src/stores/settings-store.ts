import { create } from 'zustand';
import type { Settings } from '@assistant/shared';
import { fetchSettings, saveSettings } from '../services/settings-api';

interface SettingsStore {
  settings: Settings | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  load: () => Promise<void>;
  save: (settings: Settings) => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  baseURL: '',
  apiKey: '',
  model: '',
  contextWindowSize: 128000,
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
