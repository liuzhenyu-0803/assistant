export interface ToolCallRecord {
  id: string;
  toolName: string;
  serverId: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'running' | 'success' | 'failed' | 'cancelled';
  error?: string;
  startedAt: string;
  completedAt?: string;
}
