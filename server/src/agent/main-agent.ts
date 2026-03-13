import fs from 'node:fs';
import type { Response } from 'express';
import type {
  ConversationDetail,
  Message,
  MessageContent,
  ToolCallRecord,
  MCPToolInfo,
} from '@assistant/shared';
import { createToolCallId } from '@assistant/shared';
import { modelClient } from './model-client.js';
import { buildSystemPrompt } from './system-prompt.js';
import { sendSSEEvent } from '../utils/sse.js';
import { logger } from '../utils/logger.js';
import { mcpManager } from '../mcp/mcp-manager.js';
import { convertMCPToolsToOpenAI } from '../mcp/tool-converter.js';
import { skillLoader } from '../skills/skill-loader.js';
import { AppError } from '../utils/errors.js';
import { getMessagesAfterSummary, summaryService } from '../services/summary-service.js';
import { attachmentService } from '../services/attachment-service.js';
import { subAgentService } from '../services/sub-agent-service.js';
import {
  convertSubAgentToolsToOpenAI,
  createSubAgentToolDefinitions,
  executeSubAgentTool,
} from './sub-agent-orchestrator.js';
import type { ModelMessage, ModelToolCall } from './model-client.js';

export interface SSEWriter {
  send(event: string, data: unknown): void;
}

interface PreparedConversationContext {
  summary: ConversationDetail['summary'];
  messages: Message[];
  responsePrefix: string;
}

function createSSEWriter(res: Response): SSEWriter {
  return {
    send(event: string, data: unknown) {
      sendSSEEvent(res, event as never, data);
    },
  };
}

function buildUserMessageContent(
  conversationId: string,
  message: Message,
): string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> {
  const parts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [];
  const nonImageAttachments: string[] = [];

  for (const content of message.content) {
    if (content.type === 'text') {
      parts.push({ type: 'text', text: content.text });
      continue;
    }

    if (content.type !== 'attachment') {
      continue;
    }

    if (content.attachment.mimeType.startsWith('image/')) {
      const filePath = attachmentService.getAttachmentPath(conversationId, content.attachment.filename);
      const mimeType = content.attachment.mimeType || 'image/png';
      const base64 = fs.readFileSync(filePath).toString('base64');
      parts.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${base64}` },
      });
      parts.push({ type: 'text', text: `[图片附件: ${content.attachment.originalName}]` });
    } else {
      nonImageAttachments.push(
        `${content.attachment.originalName}（路径: ${attachmentService.getAttachmentPath(conversationId, content.attachment.filename)}）`,
      );
    }
  }

  if (nonImageAttachments.length > 0) {
    parts.push({
      type: 'text',
      text: `以下为非图片附件，不能直接作为模型输入；如需读取请使用可用工具：\n- ${nonImageAttachments.join('\n- ')}`,
    });
  }

  if (parts.length === 1 && parts[0].type === 'text') {
    return parts[0].text || '(empty)';
  }

  return parts.length > 0 ? parts : '(empty)';
}

function buildModelMessages(
  context: PreparedConversationContext,
  conversationId: string,
  tools: MCPToolInfo[],
): ModelMessage[] {
  const messages: ModelMessage[] = [];
  const allSkills = skillLoader.getAllSkillMetas();

  messages.push({
    role: 'system',
    content: buildSystemPrompt(tools, allSkills),
  });

  if (context.summary) {
    messages.push({
      role: 'system',
      content: `以下是之前对话的摘要：\n\n${context.summary.text}`,
    });
  }

  for (const message of context.messages) {
    if (message.role === 'user') {
      const textParts: string[] = [];

      for (const content of message.content) {
        if (content.type === 'text') {
          textParts.push(content.text);
        } else if (content.type === 'attachment') {
          textParts.push(`[附件: ${content.attachment.originalName}]`);
        }
      }

      messages.push({ role: 'user', content: buildUserMessageContent(conversationId, message) });
      continue;
    }

    const textParts: string[] = [];
    const toolCalls: { id: string; type: 'function'; function: { name: string; arguments: string } }[] = [];

    for (const content of message.content) {
      if (content.type === 'text') {
        textParts.push(content.text);
      } else if (content.type === 'tool-call') {
        toolCalls.push({
          id: content.toolCall.id,
          type: 'function',
          function: {
            name: content.toolCall.toolName,
            arguments: JSON.stringify(content.toolCall.arguments),
          },
        });
      }
    }

    messages.push({
      role: 'assistant',
      content: textParts.join('\n') || null,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    });

    for (const content of message.content) {
      if (content.type === 'tool-call' && content.toolCall.status !== 'running') {
        const resultContent =
          content.toolCall.result ??
          (content.toolCall.error ? `Error: ${content.toolCall.error}` : '');

        messages.push({
          role: 'tool',
          content: resultContent,
          tool_call_id: content.toolCall.id,
        });
      }
    }
  }

  return messages;
}

async function prepareConversationContext(
  conversation: ConversationDetail,
  res: Response,
  abortSignal: AbortSignal,
): Promise<PreparedConversationContext> {
  const shouldSummarize = await summaryService.shouldSummarize(conversation);

  if (!shouldSummarize) {
    return {
      summary: conversation.summary,
      messages: getMessagesAfterSummary(conversation),
      responsePrefix: '',
    };
  }

  const plan = await summaryService.getSummaryPlan(conversation);
  if (!plan) {
    return {
      summary: conversation.summary,
      messages: getMessagesAfterSummary(conversation),
      responsePrefix: '',
    };
  }

  sendSSEEvent(res, 'summary-start', { upToMessageId: plan.upToMessageId });

  try {
    const summary = await summaryService.generateSummary(conversation, abortSignal);
    const updatedConversation = await summaryService.applySummary(conversation, summary);

    sendSSEEvent(res, 'summary-end', {
      upToMessageId: summary.upToMessageId,
      status: 'success',
    });

    return {
      summary: updatedConversation.summary,
      messages: getMessagesAfterSummary(updatedConversation),
      responsePrefix: '',
    };
  } catch (error) {
    if (
      abortSignal.aborted ||
      (error instanceof Error && error.name === 'AbortError') ||
      (error instanceof AppError && error.code === 'CONFIG_INCOMPLETE')
    ) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : String(error);
    logger.warn(`[summary] Failed for conversation ${conversation.id}: ${detail}`);

    sendSSEEvent(res, 'summary-error', {
      upToMessageId: plan.upToMessageId,
      message: '摘要生成失败，已截断较早消息',
    });

    const truncatedContext = await summaryService.buildTruncatedContext(conversation);

    return {
      summary: conversation.summary,
      messages: truncatedContext.messages,
      responsePrefix:
        '> 注：由于上下文过长且摘要失败，较早消息已被截断，本次回复可能遗漏更早对话细节。\n\n',
    };
  }
}

export async function runMainAgent(
  conversation: ConversationDetail,
  runId: string,
  res: Response,
  abortSignal: AbortSignal,
): Promise<MessageContent[]> {
  const sseWriter = createSSEWriter(res);
  void sseWriter;
  void runId;

  const preparedContext = await prepareConversationContext(conversation, res, abortSignal);
  const mcpTools = mcpManager.getAllTools();
  const subAgentConfigs = await subAgentService.getEnabledSubAgents();
  const subAgentTools = createSubAgentToolDefinitions(subAgentConfigs);
  const allPromptTools: MCPToolInfo[] = [
    ...mcpTools,
    ...subAgentTools.map((tool) => ({
      serverId: 'internal-subagent',
      serverName: '内部子代理',
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  ];
  const messages = buildModelMessages(preparedContext, conversation.id, allPromptTools);
  const openAITools = [
    ...convertMCPToolsToOpenAI(mcpTools),
    ...convertSubAgentToolsToOpenAI(subAgentTools),
  ];

  const accumulatedContent: MessageContent[] = [];
  let textBuffer = '';
  const MAX_ITERATIONS = 10;

  if (preparedContext.responsePrefix) {
    textBuffer = preparedContext.responsePrefix;
    accumulatedContent.push({ type: 'text', text: textBuffer });
    sendSSEEvent(res, 'text-delta', { delta: preparedContext.responsePrefix });
  }

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    if (abortSignal.aborted) {
      break;
    }

    let finishReason: 'stop' | 'tool_calls' | null = null;
    const iterationToolCalls = new Map<string, ModelToolCall>();
    let iterationHasText = false;

    try {
      for await (const event of modelClient.streamChatCompletion(
        messages,
        openAITools.length > 0 ? openAITools : undefined,
        abortSignal,
      )) {
        if (abortSignal.aborted) {
          break;
        }

        if (event.type === 'text-delta') {
          textBuffer += event.delta;
          iterationHasText = true;
          sendSSEEvent(res, 'text-delta', { delta: event.delta });
        } else if (event.type === 'reasoning-delta') {
          sendSSEEvent(res, 'reasoning-delta', { delta: event.delta });
        } else if (event.type === 'reasoning-end') {
          sendSSEEvent(res, 'reasoning-end', { status: 'completed' });
        } else if (event.type === 'tool-call-delta') {
          iterationToolCalls.set(String(event.toolCall.index), event.toolCall);
        } else if (event.type === 'finish') {
          finishReason = event.reason;
        }
      }
    } catch (error) {
      if (abortSignal.aborted) {
        break;
      }
      throw error;
    }

    if (abortSignal.aborted) {
      break;
    }

    if (textBuffer && (iterationHasText || accumulatedContent.some((content) => content.type === 'text'))) {
      const existingTextIndex = accumulatedContent.findIndex((content) => content.type === 'text');
      if (existingTextIndex >= 0) {
        accumulatedContent[existingTextIndex] = { type: 'text', text: textBuffer };
      } else {
        accumulatedContent.push({ type: 'text', text: textBuffer });
      }
    }

    if (finishReason === 'stop' || finishReason === null) {
      break;
    }

    if (finishReason === 'tool_calls' && iterationToolCalls.size > 0) {
      const toolCallsToExecute = [...iterationToolCalls.values()].map((toolCall) => {
        const id = toolCall.id || createToolCallId();
        let parsedArgs: Record<string, unknown> = {};

        try {
          parsedArgs = JSON.parse(toolCall.arguments) as Record<string, unknown>;
        } catch {
          parsedArgs = { raw: toolCall.arguments };
        }

        return {
          modelId: toolCall.id || id,
          id,
          name: toolCall.name,
          args: parsedArgs,
        };
      });

      logger.info(
        `[main-agent] Iteration ${iteration}: executing tool calls: ${toolCallsToExecute
          .map((toolCall) => toolCall.name)
          .join(', ')}`,
      );

      messages.push({
        role: 'assistant',
        content: textBuffer || null,
        tool_calls: toolCallsToExecute.map((toolCall) => ({
          id: toolCall.modelId,
          type: 'function',
          function: {
            name: toolCall.name,
            arguments: JSON.stringify(toolCall.args),
          },
        })),
      });

      for (const toolCall of toolCallsToExecute) {
        if (abortSignal.aborted) {
          break;
        }

        const matchedSubAgentTool = subAgentTools.find((entry) => entry.name === toolCall.name);
        const serverId = matchedSubAgentTool
          ? 'internal-subagent'
          : mcpTools.find((entry) => entry.name === toolCall.name)?.serverId ?? '';

        const toolCallRecord: ToolCallRecord = {
          id: toolCall.id,
          toolName: toolCall.name,
          serverId,
          arguments: toolCall.args,
          status: 'running',
          startedAt: new Date().toISOString(),
        };

        sendSSEEvent(res, 'tool-call-start', {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          arguments: toolCall.args,
        });

        try {
          let result: string;

          if (matchedSubAgentTool) {
            const subAgentResult = await executeSubAgentTool(
              matchedSubAgentTool.subAgent,
              {
                task:
                  typeof toolCall.args.task === 'string'
                    ? toolCall.args.task
                    : JSON.stringify(toolCall.args, null, 2),
                context: typeof toolCall.args.context === 'string' ? toolCall.args.context : undefined,
              },
              res,
              abortSignal,
            );
            result = subAgentResult.toolResult;
            accumulatedContent.push({ type: 'sub-agent', subAgent: subAgentResult.record });
          } else {
            result = await mcpManager.callTool(toolCall.name, toolCall.args, abortSignal);
          }

          toolCallRecord.status = 'success';
          toolCallRecord.result = result;
          toolCallRecord.completedAt = new Date().toISOString();

          sendSSEEvent(res, 'tool-call-end', {
            toolCallId: toolCall.id,
            result,
            status: 'success',
          });

          messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.modelId,
          });
        } catch (toolError) {
          if (abortSignal.aborted) {
            toolCallRecord.status = 'cancelled';
            toolCallRecord.completedAt = new Date().toISOString();
            accumulatedContent.push({ type: 'tool-call', toolCall: toolCallRecord });
            break;
          }

          const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
          toolCallRecord.status = 'failed';
          toolCallRecord.error = errorMessage;
          toolCallRecord.completedAt = new Date().toISOString();

          logger.warn(`[main-agent] Tool "${toolCall.name}" failed: ${errorMessage}`);

          sendSSEEvent(res, 'tool-call-error', {
            toolCallId: toolCall.id,
            error: errorMessage,
            status: 'failed',
          });

          messages.push({
            role: 'tool',
            content: `Error: ${errorMessage}`,
            tool_call_id: toolCall.modelId,
          });
        }

        accumulatedContent.push({ type: 'tool-call', toolCall: toolCallRecord });
      }

      if (abortSignal.aborted) {
        break;
      }
    }
  }

  return accumulatedContent;
}

export { createSSEWriter };
