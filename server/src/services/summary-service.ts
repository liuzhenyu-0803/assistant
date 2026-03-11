import type { ConversationDetail, Message, MessageContent, Summary } from '@assistant/shared';
import { estimateTokens } from '@assistant/shared';
import type { ModelMessage } from '../agent/model-client.js';
import { modelClient } from '../agent/model-client.js';
import { conversationStore } from '../storage/conversation-store.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { settingsService } from './settings-service.js';

const SUMMARY_TRIGGER_RATIO = 0.5;
const SUMMARY_RECENT_CONTEXT_RATIO = 0.25;
const MAX_RECENT_MESSAGES = 4;

export interface SummaryPlan {
  upToMessageId: string;
  sourceMessages: Message[];
  recentMessages: Message[];
}

function renderContent(content: MessageContent): string {
  switch (content.type) {
    case 'text':
      return content.text;
    case 'attachment':
      return `[附件] ${content.attachment.originalName}`;
    case 'tool-call':
      return [
        `[工具调用] ${content.toolCall.toolName}`,
        `参数: ${JSON.stringify(content.toolCall.arguments)}`,
        content.toolCall.result ? `结果: ${content.toolCall.result}` : null,
        content.toolCall.error ? `错误: ${content.toolCall.error}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    case 'sub-agent':
      return [
        `[子代理] ${content.subAgent.task}`,
        content.subAgent.summary ? `摘要: ${content.subAgent.summary}` : null,
        content.subAgent.detail ? `详情: ${content.subAgent.detail}` : null,
        content.subAgent.error ? `错误: ${content.subAgent.error}` : null,
      ]
        .filter(Boolean)
        .join('\n');
    default:
      return '';
  }
}

function renderMessage(message: Message): string {
  const roleLabel = message.role === 'user' ? '用户' : '助手';
  const content = message.content.map(renderContent).filter(Boolean).join('\n');
  return `[${roleLabel}] ${message.createdAt}\n${content || '(empty)'}`;
}

function renderMessages(messages: Message[]): string {
  return messages.map(renderMessage).join('\n\n');
}

async function getContextWindowSize(): Promise<number> {
  const settings = await settingsService.getSettings();
  return Math.max(1, settings.contextWindowSize);
}

function getTriggerTokenLimit(contextWindowSize: number): number {
  return Math.max(1, Math.floor(contextWindowSize * SUMMARY_TRIGGER_RATIO));
}

function getEffectiveHistoryText(conversation: ConversationDetail): string {
  const summaryText = conversation.summary ? `历史摘要：\n${conversation.summary.text}\n\n` : '';
  return `${summaryText}${renderMessages(getMessagesAfterSummary(conversation))}`.trim();
}

function buildSummaryPlan(
  conversation: ConversationDetail,
  contextWindowSize: number,
): SummaryPlan | null {
  const effectiveMessages = getMessagesAfterSummary(conversation);

  if (effectiveMessages.length < 2) {
    return null;
  }

  const totalTokens = estimateTokens(getEffectiveHistoryText(conversation));
  if (totalTokens <= getTriggerTokenLimit(contextWindowSize)) {
    return null;
  }

  const maxRecentTokens = Math.max(1, Math.floor(contextWindowSize * SUMMARY_RECENT_CONTEXT_RATIO));
  const minimumRecentCount = Math.min(MAX_RECENT_MESSAGES, effectiveMessages.length - 1);

  let recentTokens = 0;
  let recentStartIndex = effectiveMessages.length;
  let keptCount = 0;

  for (let index = effectiveMessages.length - 1; index >= 0; index -= 1) {
    const nextTokens = estimateTokens(renderMessage(effectiveMessages[index]));
    const mustKeep = keptCount < minimumRecentCount;

    if (!mustKeep && recentTokens + nextTokens > maxRecentTokens) {
      break;
    }

    recentTokens += nextTokens;
    recentStartIndex = index;
    keptCount += 1;
  }

  if (recentStartIndex <= 0) {
    return null;
  }

  const sourceMessages = effectiveMessages.slice(0, recentStartIndex);
  if (sourceMessages.length === 0) {
    return null;
  }

  return {
    upToMessageId: sourceMessages[sourceMessages.length - 1].id,
    sourceMessages,
    recentMessages: effectiveMessages.slice(recentStartIndex),
  };
}

function buildSummaryPrompt(conversation: ConversationDetail, plan: SummaryPlan): ModelMessage[] {
  const promptParts: string[] = [];

  if (conversation.summary?.text) {
    promptParts.push(`已有摘要：\n${conversation.summary.text}`);
  }

  promptParts.push(`需要继续合并到摘要的对话：\n${renderMessages(plan.sourceMessages)}`);
  promptParts.push('请输出新的上下文摘要，用于后续继续对话。');

  return [
    {
      role: 'system',
      content: [
        '你是一个对话上下文摘要助手。',
        '请用简洁中文总结会话的长期上下文。',
        '必须保留：用户目标、关键约束、已确认事实、已完成工作、待处理问题、重要工具调用结果。',
        '不要编造未出现的信息。',
        '输出使用 Markdown 列表，尽量控制在 12 条以内。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: promptParts.join('\n\n'),
    },
  ];
}

async function collectSummaryText(
  promptMessages: ModelMessage[],
  abortSignal?: AbortSignal,
): Promise<string> {
  let summaryText = '';

  for await (const event of modelClient.streamChatCompletion(promptMessages, undefined, abortSignal)) {
    if (event.type === 'text-delta') {
      summaryText += event.delta;
    }
  }

  return summaryText.trim();
}

export function getMessagesAfterSummary(conversation: ConversationDetail): Message[] {
  if (!conversation.summary) {
    return conversation.messages;
  }

  const summaryIndex = conversation.messages.findIndex(
    (message) => message.id === conversation.summary?.upToMessageId,
  );

  if (summaryIndex < 0) {
    logger.warn(
      `[summary] Conversation ${conversation.id} references missing summary boundary ${conversation.summary.upToMessageId}`,
    );
    return conversation.messages;
  }

  return conversation.messages.slice(summaryIndex + 1);
}

export const summaryService = {
  async shouldSummarize(conversation: ConversationDetail): Promise<boolean> {
    const contextWindowSize = await getContextWindowSize();
    return buildSummaryPlan(conversation, contextWindowSize) !== null;
  },

  async getSummaryPlan(conversation: ConversationDetail): Promise<SummaryPlan | null> {
    const contextWindowSize = await getContextWindowSize();
    return buildSummaryPlan(conversation, contextWindowSize);
  },

  async generateSummary(
    conversation: ConversationDetail,
    abortSignal?: AbortSignal,
  ): Promise<Summary> {
    const contextWindowSize = await getContextWindowSize();
    const plan = buildSummaryPlan(conversation, contextWindowSize);

    if (!plan) {
      throw new Error('当前会话无需生成摘要');
    }

    const summaryText = await collectSummaryText(buildSummaryPrompt(conversation, plan), abortSignal);
    if (!summaryText) {
      throw new Error('摘要模型返回为空');
    }

    return {
      text: summaryText,
      upToMessageId: plan.upToMessageId,
      createdAt: new Date().toISOString(),
    };
  },

  async applySummary(
    conversation: ConversationDetail,
    summary: Summary,
  ): Promise<ConversationDetail> {
    const latestConversation = await conversationStore.getConversation(conversation.id);
    if (!latestConversation) {
      throw new AppError('NOT_FOUND', '会话不存在');
    }

    const updatedConversation: ConversationDetail = {
      ...latestConversation,
      summary,
    };

    await conversationStore.saveConversation(updatedConversation);
    return updatedConversation;
  },

  async buildTruncatedContext(
    conversation: ConversationDetail,
  ): Promise<{ messages: Message[]; upToMessageId: string | null }> {
    const contextWindowSize = await getContextWindowSize();
    const maxTokens = getTriggerTokenLimit(contextWindowSize);
    const effectiveMessages = getMessagesAfterSummary(conversation);

    if (effectiveMessages.length === 0) {
      return { messages: [], upToMessageId: null };
    }

    const retainedMessages: Message[] = [];
    let usedTokens = conversation.summary ? estimateTokens(conversation.summary.text) : 0;
    let upToMessageId: string | null = null;

    for (let index = effectiveMessages.length - 1; index >= 0; index -= 1) {
      const message = effectiveMessages[index];
      const tokenCount = estimateTokens(renderMessage(message));

      if (retainedMessages.length === 0 || usedTokens + tokenCount <= maxTokens) {
        retainedMessages.unshift(message);
        usedTokens += tokenCount;
        continue;
      }

      if (upToMessageId === null) {
        upToMessageId = message.id;
      }
    }

    return {
      messages: retainedMessages.length > 0 ? retainedMessages : [effectiveMessages[effectiveMessages.length - 1]],
      upToMessageId,
    };
  },
};
