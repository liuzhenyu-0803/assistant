import { useState, useEffect } from 'react';
import type { MCPServerConfig, MCPServerWithStatus } from '@assistant/shared';
import { createMCPServerId } from '@assistant/shared';
import { fetchMCPServers, updateMCPServers } from '../../services/mcp-api';
import { showToast } from '../common/Toast';
import styles from './MCPSettings.module.css';

type Transport = 'stdio' | 'streamable-http' | 'sse';

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

function emptyConfig(): MCPServerConfig {
  return {
    id: createMCPServerId(),
    name: '',
    transport: 'stdio',
    enabled: true,
    command: '',
    args: [],
    env: {},
    url: '',
    headers: {},
  };
}

interface ServerEditorProps {
  config: MCPServerConfig;
  onSave: (config: MCPServerConfig) => void;
  onCancel: () => void;
}

function ServerEditor({ config: initial, onSave, onCancel }: ServerEditorProps) {
  const [form, setForm] = useState<MCPServerConfig>({ ...initial });
  const [argsText, setArgsText] = useState((initial.args ?? []).join('\n'));
  const [envText, setEnvText] = useState(
    Object.entries(initial.env ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  const [headersText, setHeadersText] = useState(
    Object.entries(initial.headers ?? {})
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = '名称不能为空';
    if (form.transport === 'stdio' && !form.command?.trim()) {
      errs.command = 'stdio transport 需要填写命令';
    }
    if ((form.transport === 'streamable-http' || form.transport === 'sse') && !form.url?.trim()) {
      errs.url = `${form.transport} transport 需要填写 URL`;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function parseKvLines(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const idx = trimmed.indexOf('=');
      if (idx < 1) continue;
      result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1);
    }
    return result;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const saved: MCPServerConfig = {
      ...form,
      name: form.name.trim(),
      command: form.transport === 'stdio' ? form.command?.trim() || undefined : undefined,
      args: form.transport === 'stdio'
        ? argsText.split('\n').map((l) => l.trim()).filter(Boolean)
        : undefined,
      env: form.transport === 'stdio' ? parseKvLines(envText) : undefined,
      url:
        form.transport !== 'stdio' ? form.url?.trim() || undefined : undefined,
      headers:
        form.transport !== 'stdio' ? parseKvLines(headersText) : undefined,
    };
    onSave(saved);
  }

  return (
    <form className={styles.editorForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.editorField}>
        <label className={styles.editorLabel}>名称</label>
        <input
          className={`${styles.editorInput} ${errors.name ? styles.editorInputError : ''}`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="My MCP Server"
          autoFocus
        />
        {errors.name && <span className={styles.editorError}>{errors.name}</span>}
      </div>

      <div className={styles.editorField}>
        <label className={styles.editorLabel}>Transport</label>
        <select
          className={styles.editorSelect}
          value={form.transport}
          onChange={(e) => setForm({ ...form, transport: e.target.value as Transport })}
        >
          <option value="stdio">stdio（本地命令）</option>
          <option value="streamable-http">streamable-http（远程 HTTP）</option>
          <option value="sse">sse（远程 SSE）</option>
        </select>
      </div>

      {form.transport === 'stdio' ? (
        <>
          <div className={styles.editorField}>
            <label className={styles.editorLabel}>命令</label>
            <input
              className={`${styles.editorInput} ${errors.command ? styles.editorInputError : ''}`}
              value={form.command ?? ''}
              onChange={(e) => setForm({ ...form, command: e.target.value })}
              placeholder="npx some-mcp-server"
            />
            {errors.command && <span className={styles.editorError}>{errors.command}</span>}
          </div>
          <div className={styles.editorField}>
            <label className={styles.editorLabel}>参数（每行一个）</label>
            <textarea
              className={styles.editorTextarea}
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder="--port&#10;3000"
              rows={3}
            />
          </div>
          <div className={styles.editorField}>
            <label className={styles.editorLabel}>环境变量（每行 KEY=VALUE）</label>
            <textarea
              className={styles.editorTextarea}
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              placeholder="API_KEY=your-key"
              rows={3}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.editorField}>
            <label className={styles.editorLabel}>URL</label>
            <input
              className={`${styles.editorInput} ${errors.url ? styles.editorInputError : ''}`}
              value={form.url ?? ''}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://your-mcp-server.example.com/mcp"
            />
            {errors.url && <span className={styles.editorError}>{errors.url}</span>}
          </div>
          <div className={styles.editorField}>
            <label className={styles.editorLabel}>请求头（每行 KEY=VALUE）</label>
            <textarea
              className={styles.editorTextarea}
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder="Authorization=Bearer token"
              rows={3}
            />
          </div>
        </>
      )}

      <div className={styles.editorField}>
        <label className={styles.editorToggle}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          />
          <span>启用此 Server</span>
        </label>
      </div>

      <div className={styles.editorActions}>
        <button type="submit" className={styles.saveBtn}>
          保存
        </button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  );
}

export function MCPSettings() {
  const [servers, setServers] = useState<MCPServerWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState<MCPServerConfig>(emptyConfig);

  useEffect(() => {
    void loadServers();
  }, []);

  async function loadServers() {
    setLoading(true);
    try {
      const data = await fetchMCPServers();
      setServers(data);
    } catch {
      showToast('加载 MCP Server 列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function save(configs: MCPServerConfig[]) {
    setSaving(true);
    try {
      const updated = await updateMCPServers(configs);
      setServers(updated);
      showToast('MCP 配置已保存', 'success');
    } catch {
      showToast('保存 MCP 配置失败', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnabled(id: string) {
    const configs = servers.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s,
    );
    await save(configs);
  }

  function handleStartEdit(id: string) {
    setEditingId(id);
    setIsAdding(false);
  }

  async function handleSaveEdit(updated: MCPServerConfig) {
    const configs = servers.map((s) => (s.id === updated.id ? updated : s));
    await save(configs);
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const configs = servers.filter((s) => s.id !== id);
    await save(configs);
  }

  function handleStartAdd() {
    setNewConfig(emptyConfig());
    setIsAdding(true);
    setEditingId(null);
  }

  async function handleSaveAdd(config: MCPServerConfig) {
    const configs = [...servers, config];
    await save(configs);
    setIsAdding(false);
  }

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>MCP Server 管理</h2>
        <button
          className={styles.addBtn}
          onClick={handleStartAdd}
          disabled={saving || isAdding}
        >
          + 添加 Server
        </button>
      </div>

      {isAdding && (
        <div className={styles.editorCard}>
          <div className={styles.editorCardTitle}>新建 MCP Server</div>
          <ServerEditor
            config={newConfig}
            onSave={handleSaveAdd}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {servers.length === 0 && !isAdding && (
        <div className={styles.empty}>暂无 MCP Server，点击"添加 Server"新建</div>
      )}

      {servers.map((server) => (
        <div key={server.id} className={styles.serverCard}>
          {editingId === server.id ? (
            <div className={styles.editorCard}>
              <div className={styles.editorCardTitle}>编辑：{server.name}</div>
              <ServerEditor
                config={server}
                onSave={handleSaveEdit}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
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
                    ⚠ {server.errorMessage}
                  </span>
                )}
              </div>
              <div className={styles.serverActions}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={server.enabled}
                    onChange={() => void handleToggleEnabled(server.id)}
                    disabled={saving}
                  />
                  <span>{server.enabled ? '启用' : '禁用'}</span>
                </label>
                <button
                  className={styles.editBtn}
                  onClick={() => handleStartEdit(server.id)}
                  disabled={saving}
                >
                  编辑
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => void handleDelete(server.id)}
                  disabled={saving}
                >
                  删除
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
