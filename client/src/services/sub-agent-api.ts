import type {
  SubAgentConfigTextResponse,
} from '@assistant/shared';
import { apiGet, apiPut } from './api';

export async function fetchSubAgentConfigText(): Promise<string> {
  const response = await apiGet<SubAgentConfigTextResponse>('/settings/sub-agents');
  return response.content;
}

export async function updateSubAgentConfigText(content: string): Promise<string> {
  const response = await apiPut<SubAgentConfigTextResponse>('/settings/sub-agents', { content });
  return response.content;
}
