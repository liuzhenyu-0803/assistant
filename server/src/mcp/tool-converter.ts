import type { MCPToolInfo } from '@assistant/shared';

export interface OpenAIFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export function convertMCPToolsToOpenAI(tools: MCPToolInfo[]): OpenAIFunction[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema ?? { type: 'object', properties: {} },
    },
  }));
}

export function convertMCPToolToOpenAI(tool: MCPToolInfo): OpenAIFunction {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema ?? { type: 'object', properties: {} },
    },
  };
}
