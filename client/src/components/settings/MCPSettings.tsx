import { useEffect, useState } from 'react';
import type { MCPServerConfig, MCPServerWithStatus } from '@assistant/shared';
import {
  fetchMCPConfigText,
  fetchMCPServers,
  updateMCPConfigText,
  updateMCPServers,
} from '../../services/mcp-api';
import { showToast } from '../common/Toast';
import styles from './MCPSettings.module.css';

const STATUS_LABEL: Record<string, string> = {
  connected: '已连接',
  disconnected: '未连接',
  error: '错误',
};

const STATUS_CLASS: Record<string, string> = {
  connected: styles.statusConnected,
  disconnected: styles.statusDisconnected,
  error: styles.statusError,
};

export function MCPSettings() {
  const [servers, setServers] = useState<MCPServerWithStatus[]>([]);
  const [configText, setConfigText] = useState('');
  const [loadingServers, setLoadingServers] = useState(true);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [updatingServerId, setUpdatingServerId] = useState<string | null>(null);

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadServers() {
    setLoadingServers(true);
    try {
      const data = await fetchMCPServers();
      setServers(data);
    } catch {
      showToast('加载 MCP Server 列表失败', 'error');
    } finally {
      setLoadingServers(false);
    }
  }

  async function loadConfig() {
    setLoadingConfig(true);
    try {
      const content = await fetchMCPConfigText();
      setConfigText(content);
      setConfigError(null);
      setDirty(false);
    } catch {
      showToast('加载 MCP 配置文件失败', 'error');
    } finally {
      setLoadingConfig(false);
    }
  }

  async function loadAll() {
    await Promise.all([loadServers(), loadConfig()]);
  }

  function parseConfigText(content: string): MCPServerConfig[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error('配置文件必须是合法 JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new Error('配置文件顶层必须是数组');
    }

    return parsed as MCPServerConfig[];
  }

  async function handleConfigBlur() {
    if (!dirty || savingConfig) {
      return;
    }

    try {
      parseConfigText(configText);
      setSavingConfig(true);
      setConfigError(null);
      const content = await updateMCPConfigText(configText);
      setConfigText(content);
      setDirty(false);
      await loadServers();
      showToast('MCP 配置已保存', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存 MCP 配置失败';
      setConfigError(message);
      showToast(message, 'error');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleToggleEnabled(id: string) {
    if (dirty) {
      showToast('请先保存配置文件修改', 'error');
      return;
    }

    setUpdatingServerId(id);
    try {
      const configs: MCPServerConfig[] = servers.map(({ status, errorMessage, ...server }) =>
        server.id === id ? { ...server, enabled: !server.enabled } : server,
      );
      const updated = await updateMCPServers(configs);
      setServers(updated);
      const content = await fetchMCPConfigText();
      setConfigText(content);
      setConfigError(null);
      setDirty(false);
      showToast('MCP Server 状态已更新', 'success');
    } catch {
      showToast('更新 MCP Server 状态失败', 'error');
    } finally {
      setUpdatingServerId(null);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.header}>
          <h2 className={styles.title}>MCP Server</h2>
          {dirty && <span className={styles.hint}>请先保存配置文件修改后再切换开关</span>}
        </div>

        {loadingServers ? (
          <div className={styles.loading}>加载中...</div>
        ) : servers.length === 0 ? null : (
          servers.map((server) => (
            <div key={server.id} className={styles.serverCard}>
              <div className={styles.serverRow}>
                <div className={styles.serverInfo}>
                  <span className={styles.serverName}>{server.name}</span>
                  <span className={styles.serverTransport}>{server.transport}</span>
                  <span
                    className={`${styles.serverStatus} ${STATUS_CLASS[server.status] ?? styles.statusDisconnected}`}
                  >
                    {STATUS_LABEL[server.status] ?? server.status}
                  </span>
                  {server.errorMessage && (
                    <span className={styles.serverError} title={server.errorMessage}>
                      {server.errorMessage}
                    </span>
                  )}
                </div>
                <label className={styles.toggleLabel}>
                  <span className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={server.enabled}
                      onChange={() => void handleToggleEnabled(server.id)}
                      disabled={dirty || savingConfig || updatingServerId !== null}
                    />
                    <span className={styles.switchTrack} aria-hidden="true">
                      <span className={styles.switchThumb} />
                    </span>
                  </span>
                  <span>
                    {updatingServerId === server.id ? '更新中...' : server.enabled ? '启用' : '禁用'}
                  </span>
                </label>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>MCP 配置文件</h2>
            <p className={styles.description}>
              请直接编辑 JSON 配置文件来新增、删除或修改 MCP Server。编辑框失去焦点后会自动保存。
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
              rows={20}
              disabled={savingConfig}
            />
            {configError && <div className={styles.error}>{configError}</div>}
          </>
        )}
      </div>
    </div>
  );
}
