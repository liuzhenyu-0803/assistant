import type {
  MCPToolInfo,
  SubAgentConfig,
  SubAgentRecord,
  SubAgentToolArgs,
} from '@assistant/shared';
import { createSubAgentId } from '@assistant/shared';
import type { Response } from 'express';
import { modelClient, type ModelMessage, type ModelToolCall, type ModelToolDefinition } from './model-client.js';
import { mcpManager } from '../mcp/mcp-manager.js';
import { convertMCPToolsToOpenAI } from '../mcp/tool-converter.js';
import { sendSSEEvent } from '../utils/sse.js';

export interface SubAgentToolDefinition {
  type: 'sub-agent';
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  subAgent: SubAgentConfig;
}

export interface SubAgentExecutionResult {
  record: SubAgentRecord;
  toolResult: string;
}

const SUB_AGENT_TOOL_PREFIX = 'subagent_';
const DEFAULT_MAX_ITERATIONS = 6;

export function createSubAgentToolName(id: string): string {
  return `${SUB_AGENT_TOOL_PREFIX}${id}`;
}

export function createSubAgentToolDefinitions(subAgents: SubAgentConfig[]): SubAgentToolDefinition[] {
  return subAgents.map((subAgent) => ({
    type: 'sub-agent',
    name: createSubAgentToolName(subAgent.id),
    description: [
      `调用内部子代理 ${subAgent.name}`,
      subAgent.description?.trim() || '用于处理适合拆分的专项任务。',
      '输入 task 应该是自包含的具体任务说明。',
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: '需要交给该子代理处理的具体任务',
        },
        context: {
          type: 'string',
          description: '可选的补充上下文',
        },
      },
      required: ['task'],
      additionalProperties: false,
    },
    subAgent,
  }));
}

export function convertSubAgentToolsToOpenAI(tools: SubAgentToolDefinition[]): ModelToolDefinition[] {
  return tools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}

export function isSubAgentToolName(name: string): boolean {
  return name.startsWith(SUB_AGENT_TOOL_PREFIX);
}

function buildAllowedMCPTools(subAgent: SubAgentConfig, allTools: MCPToolInfo[]): MCPToolInfo[] {
  if (!subAgent.allowedTools || subAgent.allowedTools.length === 0 || subAgent.allowedTools.includes('*')) {
    return allTools;
  }

  const allowedNames = new Set(subAgent.allowedTools);
  return allTools.filter((tool) => allowedNames.has(tool.name));
}

function buildSubAgentMessages(subAgent: SubAgentConfig, args: SubAgentToolArgs): ModelMessage[] {
  const userContent = args.context?.trim()
    ? `任务：${args.task.trim()}\n\n补充上下文：\n${args.context.trim()}`
    : args.task.trim();

  return [
    { role: 'system', content: subAgent.systemPrompt },
    { role: 'user', content: userContent },
  ];
}

function buildToolResult(summary: string, detail: string): string {
  return `Summary: ${summary}\n\nDetail:\n${detail}`;
}

function deriveSummary(detail: string): string {
  const normalized = detail.trim();
  if (!normalized) {
    return '子代理已完成任务';
  }

  const firstLine = normalized.split(/\n+/).find((line) => line.trim().length > 0)?.trim();
  return firstLine || '子代理已完成任务';
}

export async function executeSubAgentTool(
  subAgent: SubAgentConfig,
  args: SubAgentToolArgs,
  res: Response,
  abortSignal: AbortSignal,
): Promise<SubAgentExecutionResult> {
  const subAgentId = createSubAgentId();
  const startedAt = new Date().toISOString();
  const record: SubAgentRecord = {
    id: subAgentId,
    task: args.task,
    status: 'running',
    startedAt,
  };

  sendSSEEvent(res, 'sub-agent-start', {
    subAgentId,
    task: args.task,
  });

  const detailParts: string[] = [];
  const subAgentMessages = buildSubAgentMessages(subAgent, args);
  const allMCPTools = mcpManager.getAllTools();
  const allowedMCPTools = buildAllowedMCPTools(subAgent, allMCPTools);
  const openAITools = convertMCPToolsToOpenAI(allowedMCPTools);
  const maxIterations = subAgent.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  try {
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      if (abortSignal.aborted) {
        break;
      }

      let finishReason: 'stop' | 'tool_calls' | null = null;
      const iterationToolCalls = new Map<string, ModelToolCall>();

      for await (const event of modelClient.streamChatCompletion(
        subAgentMessages,
        openAITools.length > 0 ? openAITools : undefined,
        abortSignal,
      )) {
        if (abortSignal.aborted) {
          break;
        }

        if (event.type === 'text-delta') {
          detailParts.push(event.delta);
          sendSSEEvent(res, 'sub-agent-delta', {
            subAgentId,
            delta: event.delta,
          });
        } else if (event.type === 'tool-call-delta') {
          iterationToolCalls.set(String(event.toolCall.index), event.toolCall);
        } else if (event.type === 'finish') {
          finishReason = event.reason;
        }
      }

      if (abortSignal.aborted || finishReason === 'stop' || finishReason === null) {
        break;
      }

      if (finishReason === 'tool_calls' && iterationToolCalls.size > 0) {
        const toolCalls = [...iterationToolCalls.values()].map((toolCall) => {
          let parsedArgs: Record<string, unknown> = {};

          try {
            parsedArgs = JSON.parse(toolCall.arguments) as Record<string, unknown>;
          } catch {
            parsedArgs = { raw: toolCall.arguments };
          }

          return {
            modelId: toolCall.id,
            name: toolCall.name,
            args: parsedArgs,
          };
        });

        subAgentMessages.push({
          role: 'assistant',
          content: detailParts.join('') || null,
          tool_calls: toolCalls.map((toolCall) => ({
            id: toolCall.modelId,
            type: 'function',
            function: {
              name: toolCall.name,
              arguments: JSON.stringify(toolCall.args),
            },
          })),
        });

        for (const toolCall of toolCalls) {
          const result = await mcpManager.callTool(toolCall.name, toolCall.args, abortSignal);
          subAgentMessages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.modelId,
          });
        }
      }
    }

    if (abortSignal.aborted) {
      record.status = 'cancelled';
      record.completedAt = new Date().toISOString();
      return {
        record,
        toolResult: 'Subagent execution cancelled.',
      };
    }

    const detail = detailParts.join('').trim();
    const summary = deriveSummary(detail);
    record.status = 'success';
    record.summary = summary;
    record.detail = detail;
    record.completedAt = new Date().toISOString();

    sendSSEEvent(res, 'sub-agent-end', {
      subAgentId,
      summary,
      status: 'success',
      detail,
    });

    return {
      record,
      toolResult: buildToolResult(summary, detail),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    record.status = abortSignal.aborted ? 'cancelled' : 'failed';
    record.error = errorMessage;
    record.completedAt = new Date().toISOString();

    if (!abortSignal.aborted) {
      sendSSEEvent(res, 'sub-agent-error', {
        subAgentId,
        error: errorMessage,
        status: 'failed',
      });
    }

    return {
      record,
      toolResult: `Error: ${errorMessage}`,
    };
  }
}
