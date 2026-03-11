import type { MCPServerConfig, MCPToolInfo } from '@assistant/shared';
import { MCPConnection, type MCPConnectionStatus } from './mcp-connection.js';
import { logger } from '../utils/logger.js';

export interface MCPServerWithStatus {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  errorMessage: string | null;
}

class MCPManager {
  private connections = new Map<string, MCPConnection>();

  async initialize(configs: MCPServerConfig[]): Promise<void> {
    const enabledConfigs = configs.filter((config) => config.enabled);
    await Promise.all(
      enabledConfigs.map(async (config) => {
        const connection = new MCPConnection(config);
        this.connections.set(config.id, connection);
        await connection.connect();
      }),
    );
    logger.info(`MCP Manager initialized with ${this.connections.size} connections`);
  }

  async reinitialize(configs: MCPServerConfig[]): Promise<void> {
    await this.closeAll();
    this.connections.clear();
    await this.initialize(configs);
  }

  getAllTools(): MCPToolInfo[] {
    const tools: MCPToolInfo[] = [];

    for (const connection of this.connections.values()) {
      if (connection.status === 'connected') {
        tools.push(...connection.getTools());
      }
    }

    return tools;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    for (const connection of this.connections.values()) {
      if (connection.status !== 'connected') {
        continue;
      }

      const tool = connection.getTools().find((entry) => entry.name === toolName);
      if (tool) {
        return connection.callTool(toolName, args, abortSignal);
      }
    }

    throw new Error(`Tool "${toolName}" not found in any connected MCP Server`);
  }

  getServerStatuses(): MCPServerWithStatus[] {
    return Array.from(this.connections.values()).map((connection) => ({
      config: connection.config,
      status: connection.status,
      errorMessage: connection.errorMessage,
    }));
  }

  async closeAll(): Promise<void> {
    await Promise.all(Array.from(this.connections.values()).map((connection) => connection.close()));
  }
}

export const mcpManager = new MCPManager();
