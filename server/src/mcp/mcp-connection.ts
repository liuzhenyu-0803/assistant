import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { MCPServerConfig, MCPToolInfo } from '@assistant/shared';
import { logger } from '../utils/logger.js';

const CALL_TIMEOUT_MS = 60_000;

export type MCPConnectionStatus = 'connected' | 'disconnected' | 'error';

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

export class MCPConnection {
  readonly config: MCPServerConfig;
  private client: Client | null = null;
  private tools: MCPToolInfo[] = [];
  status: MCPConnectionStatus = 'disconnected';
  errorMessage: string | null = null;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const transport = this.createTransport();
      this.client = new Client({ name: 'assistant', version: '1.0.0' });
      await this.client.connect(transport);
      await this.refreshTools();
      this.status = 'connected';
      this.errorMessage = null;
      logger.info(`MCP Server "${this.config.name}" connected`);
    } catch (err) {
      this.status = 'error';
      this.errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`MCP Server "${this.config.name}" connection failed: ${this.errorMessage}`);
    }
  }

  private createTransport() {
    const { transport, command, args, env, url, headers } = this.config;

    if (transport === 'stdio') {
      if (!command) {
        throw new Error('stdio transport requires a command');
      }

      return new StdioClientTransport({
        command,
        args: args ?? [],
        env: env ? ({ ...process.env, ...env } as Record<string, string>) : undefined,
      });
    }

    if (transport === 'sse') {
      if (!url) {
        throw new Error('sse transport requires a url');
      }

      return new SSEClientTransport(new URL(url), {
        requestInit: headers ? { headers } : undefined,
      });
    }

    if (transport === 'streamable-http') {
      if (!url) {
        throw new Error('streamable-http transport requires a url');
      }

      return new StreamableHTTPClientTransport(new URL(url), {
        requestInit: headers ? { headers } : undefined,
      });
    }

    throw new Error(`Unknown transport: ${transport}`);
  }

  private async refreshTools(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const result = await this.client.listTools();
      this.tools = (result.tools ?? []).map((tool) => ({
        serverId: this.config.id,
        serverName: this.config.name,
        name: tool.name,
        description: tool.description ?? '',
        inputSchema: (tool.inputSchema as Record<string, unknown>) ?? {
          type: 'object',
          properties: {},
        },
      }));
    } catch (err) {
      logger.error(`MCP Server "${this.config.name}" listTools failed: ${err}`);
      this.tools = [];
    }
  }

  getTools(): MCPToolInfo[] {
    return this.tools;
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    if (!this.client || this.status !== 'connected') {
      throw new Error(`MCP Server "${this.config.name}" is not connected`);
    }

    if (abortSignal?.aborted) {
      throw createAbortError(`Tool call "${toolName}" was aborted`);
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Tool call "${toolName}" timed out after 60s`)), CALL_TIMEOUT_MS);
    });

    const callPromise = this.client.callTool({ name: toolName, arguments: args });

    const raceParticipants: Array<Promise<unknown>> = [callPromise, timeoutPromise];
    if (abortSignal) {
      raceParticipants.push(
        new Promise((_, reject) => {
          abortSignal.addEventListener(
            'abort',
            () => reject(createAbortError(`Tool call "${toolName}" was aborted`)),
            { once: true },
          );
        }),
      );
    }

    const result = await Promise.race(raceParticipants);

    if (typeof result === 'object' && result && 'content' in result && Array.isArray(result.content)) {
      return result.content
        .map((content) =>
          content && typeof content === 'object' && 'type' in content && content.type === 'text'
            ? String((content as { text?: string }).text ?? '')
            : JSON.stringify(content),
        )
        .join('\n');
    }

    return JSON.stringify(result);
  }

  async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
      } catch {
        // Ignore close errors.
      }
      this.client = null;
    }

    this.status = 'disconnected';
  }
}
