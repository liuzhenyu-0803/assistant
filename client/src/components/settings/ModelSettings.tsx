import { useState, useEffect } from 'react';
import type { Settings } from '@assistant/shared';
import { useSettingsStore } from '../../stores/settings-store';
import { showToast } from '../common/Toast';
import styles from './ModelSettings.module.css';

export function ModelSettings() {
  const { settings, loading, saving, load, save } = useSettingsStore();

  const [form, setForm] = useState<Settings>({
    baseURL: '',
    apiKey: '',
    model: '',
    contextWindowSize: 128000,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Settings, string>>>({});

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (settings) {
      setForm({
        baseURL: settings.baseURL,
        apiKey: settings.apiKey,
        model: settings.model,
        contextWindowSize: settings.contextWindowSize,
      });
    }
  }, [settings]);

  function validate(): boolean {
    const newErrors: Partial<Record<keyof Settings, string>> = {};
    if (!form.baseURL.trim()) newErrors.baseURL = 'Base URL is required';
    if (!form.apiKey.trim()) newErrors.apiKey = 'API Key is required';
    if (!form.model.trim()) newErrors.model = 'Model is required';
    if (!form.contextWindowSize || form.contextWindowSize < 1024) {
      newErrors.contextWindowSize = 'Context window size must be at least 1024';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    try {
      await save(form);
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  }

  function handleChange(field: keyof Settings, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading settings...</div>;
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>Model Configuration</h2>

      <div className={styles.field}>
        <label htmlFor="baseURL" className={styles.label}>
          Base URL
        </label>
        <input
          id="baseURL"
          type="url"
          className={`${styles.input} ${errors.baseURL ? styles.inputError : ''}`}
          value={form.baseURL}
          onChange={(e) => handleChange('baseURL', e.target.value)}
          placeholder="https://api.openai.com/v1"
          autoComplete="off"
        />
        {errors.baseURL && <span className={styles.errorMsg}>{errors.baseURL}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="apiKey" className={styles.label}>
          API Key
        </label>
        <input
          id="apiKey"
          type="password"
          className={`${styles.input} ${errors.apiKey ? styles.inputError : ''}`}
          value={form.apiKey}
          onChange={(e) => handleChange('apiKey', e.target.value)}
          placeholder="sk-..."
          autoComplete="new-password"
        />
        {errors.apiKey && <span className={styles.errorMsg}>{errors.apiKey}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="model" className={styles.label}>
          Model
        </label>
        <input
          id="model"
          type="text"
          className={`${styles.input} ${errors.model ? styles.inputError : ''}`}
          value={form.model}
          onChange={(e) => handleChange('model', e.target.value)}
          placeholder="gpt-4o"
          autoComplete="off"
        />
        {errors.model && <span className={styles.errorMsg}>{errors.model}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="contextWindowSize" className={styles.label}>
          Context Window Size (tokens)
        </label>
        <input
          id="contextWindowSize"
          type="number"
          className={`${styles.input} ${errors.contextWindowSize ? styles.inputError : ''}`}
          value={form.contextWindowSize}
          onChange={(e) => handleChange('contextWindowSize', parseInt(e.target.value, 10) || 0)}
          min={1024}
          step={1024}
        />
        {errors.contextWindowSize && (
          <span className={styles.errorMsg}>{errors.contextWindowSize}</span>
        )}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
