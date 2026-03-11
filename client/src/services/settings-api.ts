import type { Settings } from '@assistant/shared';
import { apiGet, apiPut } from './api';

export async function fetchSettings(): Promise<Settings> {
  return apiGet<Settings>('/settings');
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  return apiPut<Settings>('/settings', settings);
}
