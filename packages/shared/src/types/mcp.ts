export interface MCPServerConfig {
  id: string;
  name: string;
  transport: 'stdio' | 'streamable-http' | 'sse';
  enabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}
