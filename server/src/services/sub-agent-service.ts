import type { SubAgentConfig, SubAgentConfigFile } from '@assistant/shared';
import { jsonStore } from '../storage/json-store.js';
import { SUB_AGENTS_FILE } from '../storage/paths.js';
import { AppError } from '../utils/errors.js';

const DEFAULT_SUB_AGENT_CONFIG: SubAgentConfigFile = {
  subAgents: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeStringArray(value: unknown, fieldName: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new AppError('INVALID_REQUEST', `${fieldName} must be an array of strings`);
  }

  return value.map((entry) => entry.trim()).filter(Boolean);
}

function normalizeSubAgentConfig(config: SubAgentConfig, index: number): SubAgentConfig {
  const id = config.id.trim();
  const name = config.name.trim();
  const systemPrompt = config.systemPrompt.trim();

  if (!id) {
    throw new AppError('INVALID_REQUEST', `subAgents[${index}].id 不能为空`);
  }

  if (!name) {
    throw new AppError('INVALID_REQUEST', `subAgents[${index}].name 不能为空`);
  }

  if (!systemPrompt) {
    throw new AppError('INVALID_REQUEST', `subAgents[${index}].systemPrompt 不能为空`);
  }

  if (config.maxIterations !== undefined) {
    if (!Number.isInteger(config.maxIterations) || config.maxIterations < 1 || config.maxIterations > 20) {
      throw new AppError('INVALID_REQUEST', `subAgents[${index}].maxIterations 必须是 1 到 20 之间的整数`);
    }
  }

  return {
    id,
    name,
    description: config.description?.trim() || undefined,
    enabled: Boolean(config.enabled),
    systemPrompt,
    model: config.model?.trim() || undefined,
    maxIterations: config.maxIterations,
    allowedTools: normalizeStringArray(config.allowedTools, `subAgents[${index}].allowedTools`),
  };
}

function validateConfigFile(config: SubAgentConfigFile): SubAgentConfigFile {
  if (!Array.isArray(config.subAgents)) {
    throw new AppError('INVALID_REQUEST', 'subAgents 必须是数组');
  }

  const normalizedSubAgents = config.subAgents.map((entry, index) => normalizeSubAgentConfig(entry, index));
  const ids = new Set<string>();

  for (const [index, subAgent] of normalizedSubAgents.entries()) {
    if (ids.has(subAgent.id)) {
      throw new AppError('INVALID_REQUEST', `subAgents[${index}].id 不能重复`);
    }
    ids.add(subAgent.id);
  }

  return {
    subAgents: normalizedSubAgents,
  };
}

function parseConfigFile(data: unknown): SubAgentConfigFile {
  if (!isRecord(data)) {
    throw new AppError('INVALID_REQUEST', 'SubAgent 配置文件顶层必须是对象');
  }

  return validateConfigFile({
    subAgents: data.subAgents as SubAgentConfig[],
  });
}

function formatConfigText(config: SubAgentConfigFile): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

function parseConfigText(content: string): SubAgentConfigFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppError('INVALID_REQUEST', 'SubAgent 配置必须是合法 JSON');
  }

  return parseConfigFile(parsed);
}

export const subAgentService = {
  async getConfigFile(): Promise<SubAgentConfigFile> {
    const data = await jsonStore.read<unknown>(SUB_AGENTS_FILE);
    if (!data) {
      return DEFAULT_SUB_AGENT_CONFIG;
    }

    return parseConfigFile(data);
  },

  async getConfigText(): Promise<string> {
    const config = await this.getConfigFile();
    return formatConfigText(config);
  },

  async getEnabledSubAgents(): Promise<SubAgentConfig[]> {
    const config = await this.getConfigFile();
    return config.subAgents.filter((entry) => entry.enabled);
  },

  async updateConfigFile(config: SubAgentConfigFile): Promise<SubAgentConfigFile> {
    const normalized = validateConfigFile(config);
    await jsonStore.write(SUB_AGENTS_FILE, normalized);
    return normalized;
  },

  async updateConfigText(content: string): Promise<string> {
    const config = parseConfigText(content);
    const normalized = await this.updateConfigFile(config);
    return formatConfigText(normalized);
  },
};
