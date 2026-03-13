import { useCallback, useEffect, useMemo, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import type { ModelProvider, ModelConfig, Settings } from '@assistant/shared';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../stores/settings-store';
import { apiGet, apiPut } from '../../services/api';
import styles from './ModelSettings.module.css';

export const ModelSettings = forwardRef((_, ref) => {
  const { settings, loading, load, save } = useSettingsStore();
  const [form, setForm] = useState<Settings>(DEFAULT_SETTINGS);
  const [selectedProviderName, setSelectedProviderName] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // 配置文件编辑相关状态
  const [providersJson, setProvidersJson] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadProvidersLoading, setLoadProvidersLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // 保存当前选择的引用，用于关闭时保存
  const selectedProviderNameRef = useRef(selectedProviderName);
  const selectedModelRef = useRef(selectedModel);

  // 导出保存方法给父组件调用
  useImperativeHandle(ref, () => ({
    async saveCurrentSelection() {
      if (selectedProviderNameRef.current && selectedModelRef.current) {
        const newConfig: ModelConfig = {
          providerName: selectedProviderNameRef.current,
          apiKey: '',
          model: selectedModelRef.current,
        };
        const newForm = {
          ...form,
          modelConfigs: [newConfig],
          activeModelConfigId: selectedProviderNameRef.current,
        };
        await save(newForm);
      }
    },
    async reloadProviders() {
      try {
        const providers = await apiGet<ModelProvider[]>('/settings/model-providers');
        const json = JSON.stringify(providers, null, 2);
        setProvidersJson(json);
        await load();
      } catch (err) {
        console.error('Failed to reload providers:', err);
      }
    },
  }));

  useEffect(() => {
    selectedProviderNameRef.current = selectedProviderName;
    selectedModelRef.current = selectedModel;
  }, [selectedProviderName, selectedModel]);

  useEffect(() => {
    void load();
  }, [load]);

  // 加载 Provider 配置
  useEffect(() => {
    async function loadProviders() {
      try {
        setLoadProvidersLoading(true);
        const providers = await apiGet<ModelProvider[]>('/settings/model-providers');
        const json = JSON.stringify(providers, null, 2);
        setProvidersJson(json);
      } catch (err) {
        console.error('Failed to load providers:', err);
      } finally {
        setLoadProvidersLoading(false);
      }
    }
    void loadProviders();
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }

    const modelProviders = settings.modelProviders.length > 0 ? settings.modelProviders : DEFAULT_SETTINGS.modelProviders;
    const modelConfigs = settings.modelConfigs.length > 0 ? settings.modelConfigs : DEFAULT_SETTINGS.modelConfigs;

    setForm({
      modelProviders,
      modelConfigs,
      activeModelConfigId: settings.activeModelConfigId,
    });

    // 初始化时选择当前保存的 provider 和 model
    const savedConfig = modelConfigs.length > 0 ? modelConfigs[0] : null;
    const currentProviderName = savedConfig?.providerName || modelProviders[0]?.name;
    setSelectedProviderName(currentProviderName);
    setSelectedModel(savedConfig?.model || modelProviders[0]?.models[0] || '');
  }, [settings]);

  const selectedProvider = useMemo(
    () => form.modelProviders.find((p) => p.name === selectedProviderName) || null,
    [form.modelProviders, selectedProviderName],
  );

  function handleProviderChange(providerName: string) {
    setSelectedProviderName(providerName);
    // 切换 provider 时，自动选择该 provider 的第一个 model
    const provider = form.modelProviders.find((p) => p.name === providerName);
    if (provider) {
      setSelectedModel(provider.models[0] || '');
    }

    // 立即保存
    const newConfig: ModelConfig = {
      providerName,
      apiKey: '', // API Key 从配置文件读取
      model: provider?.models[0] || '',
    };
    setForm((prev) => ({
      ...prev,
      modelConfigs: [newConfig],
      activeModelConfigId: providerName,
    }));
  }

  function handleModelChange(model: string) {
    setSelectedModel(model);

    // 立即保存
    const newConfig: ModelConfig = {
      providerName: selectedProviderName,
      apiKey: '',
      model,
    };
    setForm((prev) => ({
      ...prev,
      modelConfigs: [newConfig],
      activeModelConfigId: selectedProviderName,
    }));
  }

  // 选择变化时自动保存
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  useEffect(() => {
    if (!selectedProviderName || !selectedModel) return;
    const currentForm = formRef.current;
    if (!currentForm.modelProviders.length) return;
    const newConfig: ModelConfig = {
      providerName: selectedProviderName,
      apiKey: '',
      model: selectedModel,
    };
    const newForm: Settings = {
      ...currentForm,
      modelConfigs: [newConfig],
      activeModelConfigId: selectedProviderName,
    };
    void save(newForm);
  }, [selectedProviderName, selectedModel, save]);

  // 保存 Provider 配置
  const saveProviders = useCallback(async (json: string) => {
    try {
      setError(null);
      setIsSaving(true);

      const providers = JSON.parse(json) as ModelProvider[];
      await apiPut<ModelProvider[]>('/settings/model-providers', providers);

      // 重新加载设置以更新下拉框选项
      await load();

      // 从 store 获取最新的 settings 并更新 form
      setForm((prev) => ({
        ...prev,
        modelProviders: settings?.modelProviders || prev.modelProviders,
      }));
      setHasChanges(false);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('JSON 格式错误，请检查配置');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('保存失败');
      }
      throw err; // 重新抛出错误让调用者知道
    } finally {
      setIsSaving(false);
    }
  }, [load, settings]);

  // textarea 失去焦点时自动保存
  const handleTextareaBlur = useCallback(async () => {
    if (hasChanges && !isSaving) {
      try {
        await saveProviders(providersJson);
      } catch {
        // 错误已经在 saveProviders 中处理
      }
    }
  }, [hasChanges, isSaving, providersJson, saveProviders]);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProvidersJson(e.target.value);
    setHasChanges(true);
    setError(null); // 清除之前的错误
  }, []);

  if (loading || loadProvidersLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>模型配置</h2>
        <p className={styles.hint}>
          API Key 需在配置文件中设置，此处仅可选择 Provider 和 Model
        </p>
      </div>

      <div className={styles.body}>
        <div className={styles.field}>
          <label htmlFor="provider" className={styles.label}>
            API Provider
          </label>
          <select
            id="provider"
            className={styles.select}
            value={selectedProviderName}
            onChange={(e) => handleProviderChange(e.target.value)}
          >
            {form.modelProviders.map((provider) => (
              <option key={provider.name} value={provider.name}>
                {provider.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProvider && (
          <div className={styles.field}>
            <label htmlFor="model" className={styles.label}>
              Model
            </label>
            <select
              id="model"
              className={styles.select}
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {selectedProvider.models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 配置编辑器 */}
      <div className={styles.editorSection}>
        <div className={styles.editorHeader}>
          <h3 className={styles.editorTitle}>Provider 配置文件</h3>
          <div className={styles.statusHints}>
            {isSaving && <span className={styles.savingHint}>保存中...</span>}
            {hasChanges && !isSaving && <span className={styles.unsavedHint}>修改后失去焦点自动保存</span>}
          </div>
        </div>

        <textarea
          className={styles.editorTextarea}
          value={providersJson}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          spellCheck={false}
          disabled={isSaving}
        />
        {error && <p className={styles.errorText}>{error}</p>}

        <p className={styles.editorHint}>
          配置文件的修改会立即生效，添加 Provider 后需在下拉列表中选择
        </p>
      </div>
    </div>
  );
});
