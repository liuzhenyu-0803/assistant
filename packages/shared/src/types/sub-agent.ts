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
