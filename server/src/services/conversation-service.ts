import type {
  ConversationListItem,
  ConversationDetail,
  Message,
  MessageContent,
  SendMessageContent,
} from '@assistant/shared';
import { createConversationId, createMessageId, generateTitle } from '@assistant/shared';
import { conversationStore } from '../storage/conversation-store.js';
import type { ConversationData } from '../storage/conversation-store.js';
import { attachmentService } from './attachment-service.js';
import { runService } from './run-service.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const conversationService = {
  /** 获取会话列表（含 revision 和 fork，从完整会话文件补充） */
  async listConversations(): Promise<ConversationListItem[]> {
    const indexEntries = await conversationStore.listConversations();

    return Promise.all(
      indexEntries.map(async (entry) => {
        const conversation = await conversationStore.getConversation(entry.id);

        return {
          ...entry,
          revision: conversation?.revision ?? 1,
          fork: conversation?.fork ?? null,
        };
      }),
    );
  },

  /** 新建空会话 */
  async createConversation(): Promise<ConversationDetail> {
    const now = new Date().toISOString();
    const conversation: ConversationData = {
      id: createConversationId(),
      title: '',
      revision: 1,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: null,
      messageCount: 0,
      fork: null,
      summary: null,
      messages: [],
    };

    await conversationStore.saveConversation(conversation);
    logger.info(`Created conversation: ${conversation.id}`);

    return conversation;
  },

  /** 获取会话详情（含消息） */
  async getConversation(id: string): Promise<ConversationDetail> {
    const conversation = await conversationStore.getConversation(id);
    if (!conversation) {
      throw new AppError('NOT_FOUND', '会话不存在');
    }
    return conversation;
  },

  /** 删除会话（含终止活动 Run） */
  async deleteConversation(id: string): Promise<void> {
    const exists = await conversationStore.conversationExists(id);
    if (!exists) {
      throw new AppError('NOT_FOUND', '会话不存在');
    }

    runService.stopRun(id);

    await conversationStore.deleteConversation(id);
    logger.info(`Deleted conversation: ${id}`);
  },

  /** 清空所有会话（含终止所有活动 Run，10 秒超时强制） */
  async clearAllConversations(): Promise<void> {
    await runService.stopAllRuns();
    await conversationStore.deleteAllConversations();
    logger.info('Cleared all conversations');
  },

  /**
   * 添加用户消息
   * - 校验 revision 冲突
   * - 展开 attachment 内容为完整 AttachmentRef
   * - 绑定附件（staged → attached）
   * - 首条消息时自动生成会话标题
   */
  async addUserMessage(
    id: string,
    content: SendMessageContent[],
    revision: number,
  ): Promise<Message> {
    const conversation = await conversationStore.getConversation(id);
    if (!conversation) {
      throw new AppError('NOT_FOUND', '会话不存在');
    }

    if (conversation.revision !== revision) {
      throw new AppError('CONFLICT', `会话 revision 冲突：期望 ${conversation.revision}，收到 ${revision}`);
    }

    // 解析附件 ID 列表
    const attachmentIds = content
      .filter((c): c is { type: 'attachment'; attachmentId: string } => c.type === 'attachment')
      .map((c) => c.attachmentId);

    // 查找暂存的附件元数据
    const stagedRefs = await attachmentService.getStagedAttachments(id, attachmentIds);

    // 将附件状态改为 attached，并从暂存中移除
    const boundRefs = await attachmentService.bindAttachments(id, stagedRefs);
    const refMap = new Map(boundRefs.map((r) => [r.id, r]));

    // 构建消息内容（展开 attachment）
    const messageContent: MessageContent[] = content.map((c) => {
      if (c.type === 'text') {
        return { type: 'text', text: c.text };
      }
      const ref = refMap.get(c.attachmentId);
      if (!ref) throw new AppError('NOT_FOUND', `附件 ${c.attachmentId} 未找到`);
      return { type: 'attachment', attachment: ref };
    });

    const now = new Date().toISOString();
    const message: Message = {
      id: createMessageId(),
      role: 'user',
      content: messageContent,
      status: 'completed',
      createdAt: now,
    };

    // 首条消息时生成会话标题
    const isFirstMessage = conversation.messages.length === 0;
    let title = conversation.title;
    if (isFirstMessage) {
      const firstText = content.find((c) => c.type === 'text');
      const firstAttachmentName = boundRefs[0]?.originalName ?? null;
      title = generateTitle(
        firstText?.type === 'text' ? firstText.text : null,
        firstAttachmentName,
        now,
      );
    }

    const updated: ConversationData = {
      ...conversation,
      title,
      revision: conversation.revision + 1,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: conversation.messageCount + 1,
      messages: [...conversation.messages, message],
    };

    await conversationStore.saveConversation(updated);
    logger.info(`Added user message ${message.id} to conversation ${id}`);

    return message;
  },

  /**
   * 保存助手消息（Run 完成时调用）
   */
  async addAssistantMessage(
    id: string,
    messageData: Omit<Message, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ): Promise<Message> {
    const conversation = await conversationStore.getConversation(id);
    if (!conversation) {
      throw new AppError('NOT_FOUND', '会话不存在');
    }

    const now = new Date().toISOString();
    const message: Message = {
      id: messageData.id ?? createMessageId(),
      role: 'assistant',
      content: messageData.content,
      status: messageData.status,
      runId: messageData.runId,
      createdAt: messageData.createdAt ?? now,
    };

    const updated: ConversationData = {
      ...conversation,
      revision: conversation.revision + 1,
      updatedAt: now,
      lastMessageAt: now,
      messageCount: conversation.messageCount + 1,
      messages: [...conversation.messages, message],
    };

    await conversationStore.saveConversation(updated);
    logger.info(`Added assistant message ${message.id} to conversation ${id} (status=${message.status})`);

    return message;
  },
};
