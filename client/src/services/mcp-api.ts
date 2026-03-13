import type {
  MCPConfigTextResponse,
  MCPServerConfig,
  MCPServerWithStatus,
  MCPToolInfo,
} from '@assistant/shared';
import { apiGet, apiPut } from './api';

export async function fetchMCPServers(): Promise<MCPServerWithStatus[]> {
  return apiGet<MCPServerWithStatus[]>('/mcp/servers');
}

export async function updateMCPServers(servers: MCPServerConfig[]): Promise<MCPServerWithStatus[]> {
  return apiPut<MCPServerWithStatus[]>('/mcp/servers', { servers });
}

export async function fetchMCPConfigText(): Promise<string> {
  const response = await apiGet<MCPConfigTextResponse>('/mcp/config');
  return response.content;
}

export async function updateMCPConfigText(content: string): Promise<string> {
  const response = await apiPut<MCPConfigTextResponse>('/mcp/config', { content });
  return response.content;
}

export async function fetchMCPTools(): Promise<MCPToolInfo[]> {
  return apiGet<MCPToolInfo[]>('/mcp/tools');
}
