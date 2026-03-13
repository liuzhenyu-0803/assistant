import { useEffect, useState } from 'react';
import { fetchSubAgentConfigText, updateSubAgentConfigText } from '../../services/sub-agent-api';
import { showToast } from '../common/Toast';
import styles from './MCPSettings.module.css';

export function SubAgentSettings() {
  const [configText, setConfigText] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const content = await fetchSubAgentConfigText();
      setConfigText(content);
      setConfigError(null);
      setDirty(false);
    } catch {
      showToast('加载 SubAgent 配置文件失败', 'error');
    } finally {
      setLoadingConfig(false);
    }
  }

  async function handleConfigBlur() {
    if (!dirty || savingConfig) {
      return;
    }

    try {
      JSON.parse(configText);
      setSavingConfig(true);
      setConfigError(null);
      const content = await updateSubAgentConfigText(configText);
      setConfigText(content);
      setDirty(false);
      showToast('SubAgent 配置已保存', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存 SubAgent 配置失败';
      setConfigError(message);
      showToast(message, 'error');
    } finally {
      setSavingConfig(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>SubAgent 配置文件</h2>
            <p className={styles.description}>
              请直接编辑 JSON 配置文件来新增、删除或修改 SubAgent。编辑框失去焦点后会自动保存。
            </p>
          </div>
          <div className={styles.meta}>
            {savingConfig && <span className={styles.saving}>保存中...</span>}
            {!savingConfig && dirty && <span className={styles.unsaved}>未保存</span>}
          </div>
        </div>

        {loadingConfig ? (
          <div className={styles.loading}>加载中...</div>
        ) : (
          <>
            <textarea
              className={`${styles.configEditor} ${configError ? styles.configEditorError : ''}`}
              value={configText}
              onChange={(e) => {
                setConfigText(e.target.value);
                setDirty(true);
                setConfigError(null);
              }}
              onBlur={() => void handleConfigBlur()}
              spellCheck={false}
              rows={18}
              disabled={savingConfig}
            />
            {configError && <div className={styles.error}>{configError}</div>}
          </>
        )}
      </div>
    </div>
  );
}
