export interface SubAgentConfig {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  systemPrompt: string;
  model?: string;
  maxIterations?: number;
  allowedTools?: string[];
}

export interface SubAgentConfigFile {
  subAgents: SubAgentConfig[];
}

export interface SubAgentToolArgs {
  task: string;
  context?: string;
}

export interface SubAgentRecord {
  id: string;
  task: string;
  summary?: string;
  detail?: string;
  status: 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  error?: string;
  startedAt: string;
  completedAt?: string;
}
