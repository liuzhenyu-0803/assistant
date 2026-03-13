import type { MCPServerConfig, MCPServerWithStatus, MCPToolInfo } from '@assistant/shared';
import { jsonStore } from '../storage/json-store.js';
import { MCP_SERVERS_FILE } from '../storage/paths.js';
import { mcpManager } from '../mcp/mcp-manager.js';
import { AppError } from '../utils/errors.js';

function normalizeStringRecord(
  value: Record<string, unknown> | undefined,
  fieldName: string,
): Record<string, string> | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') {
      throw new AppError('INVALID_REQUEST', `${fieldName} values must be strings`);
    }
    normalized[key] = entry;
  }

  return normalized;
}

function validateConfig(config: MCPServerConfig): MCPServerConfig {
  if (!config.id.trim()) {
    throw new AppError('INVALID_REQUEST', 'MCP server id is required');
  }

  if (!config.name.trim()) {
    throw new AppError('INVALID_REQUEST', 'MCP server name is required');
  }

  if (config.transport === 'stdio') {
    if (!config.command?.trim()) {
      throw new AppError('INVALID_REQUEST', `MCP server "${config.name}" requires a command`);
    }
  } else if (!config.url?.trim()) {
    throw new AppError('INVALID_REQUEST', `MCP server "${config.name}" requires a url`);
  }

  return {
    id: config.id.trim(),
    name: config.name.trim(),
    transport: config.transport,
    enabled: Boolean(config.enabled),
    command: config.command?.trim() || undefined,
    args: config.args?.map((arg) => arg.trim()).filter(Boolean),
    env: normalizeStringRecord(config.env, 'env'),
    url: config.url?.trim() || undefined,
    headers: normalizeStringRecord(config.headers, 'headers'),
  };
}

async function readConfigs(): Promise<MCPServerConfig[]> {
  return (await jsonStore.read<MCPServerConfig[]>(MCP_SERVERS_FILE)) ?? [];
}

function formatConfigText(configs: MCPServerConfig[]): string {
  return `${JSON.stringify(configs, null, 2)}\n`;
}

function parseConfigText(content: string): MCPServerConfig[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppError('INVALID_REQUEST', 'MCP config must be valid JSON');
  }

  if (!Array.isArray(parsed)) {
    throw new AppError('INVALID_REQUEST', 'MCP config must be an array');
  }

  return parsed as MCPServerConfig[];
}

function mapStatuses(configs: MCPServerConfig[]): MCPServerWithStatus[] {
  const runtimeStatusMap = new Map(
    mcpManager.getServerStatuses().map((entry) => [
      entry.config.id,
      { status: entry.status, errorMessage: entry.errorMessage },
    ]),
  );

  return configs.map((config) => {
    const runtime = runtimeStatusMap.get(config.id);
    return {
      ...config,
      status: runtime?.status ?? 'disconnected',
      errorMessage: runtime?.errorMessage ?? null,
    };
  });
}

export const mcpService = {
  async initialize(): Promise<void> {
    const configs = await readConfigs();
    await mcpManager.reinitialize(configs);
  },

  async getServerConfigs(): Promise<MCPServerConfig[]> {
    return readConfigs();
  },

  async getServerConfigText(): Promise<string> {
    const configs = await readConfigs();
    return formatConfigText(configs);
  },

  async getServerConfigsWithStatus(): Promise<MCPServerWithStatus[]> {
    const configs = await readConfigs();
    return mapStatuses(configs);
  },

  async updateServerConfigs(configs: MCPServerConfig[]): Promise<MCPServerWithStatus[]> {
    const normalizedConfigs = configs.map(validateConfig);
    await jsonStore.write(MCP_SERVERS_FILE, normalizedConfigs);
    await mcpManager.reinitialize(normalizedConfigs);
    return mapStatuses(normalizedConfigs);
  },

  async updateServerConfigText(content: string): Promise<string> {
    const configs = parseConfigText(content);
    await this.updateServerConfigs(configs);
    return this.getServerConfigText();
  },

  getAllTools(): MCPToolInfo[] {
    return mcpManager.getAllTools();
  },

  async closeAll(): Promise<void> {
    await mcpManager.closeAll();
  },
};
