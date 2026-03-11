import fs from 'node:fs';
import type { Conversation, Message, Summary } from '@assistant/shared';
import { jsonStore } from './json-store.js';
import {
  CONVERSATIONS_INDEX_FILE,
  conversationDir,
  conversationFile,
} from './paths.js';

/** 索引条目：仅摘要字段，不含 revision 和 fork */
export interface ConversationIndexEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
}

interface ConversationIndex {
  conversations: ConversationIndexEntry[];
}

/** 会话完整数据（含消息） */
export interface ConversationData extends Conversation {
  messages: Message[];
}

async function readIndex(): Promise<ConversationIndex> {
  const data = await jsonStore.read<ConversationIndex>(CONVERSATIONS_INDEX_FILE);
  return data ?? { conversations: [] };
}

async function writeIndex(index: ConversationIndex): Promise<void> {
  await jsonStore.write(CONVERSATIONS_INDEX_FILE, index);
}

export const conversationStore = {
  /** 获取会话摘要列表，按 updatedAt 降序 */
  async listConversations(): Promise<ConversationIndexEntry[]> {
    const index = await readIndex();
    return index.conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  /** 获取单个会话完整数据，不存在时返回 null */
  async getConversation(id: string): Promise<ConversationData | null> {
    const filePath = conversationFile(id);
    return jsonStore.read<ConversationData>(filePath);
  },

  /** 原子写入会话文件并同步更新索引 */
  async saveConversation(conversation: ConversationData): Promise<void> {
    const dir = conversationDir(conversation.id);
    await fs.promises.mkdir(dir, { recursive: true });

    const filePath = conversationFile(conversation.id);
    await jsonStore.write(filePath, conversation);

    // 更新索引
    const index = await readIndex();
    const entry: ConversationIndexEntry = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
      messageCount: conversation.messageCount,
    };

    const existingIdx = index.conversations.findIndex((c) => c.id === conversation.id);
    if (existingIdx >= 0) {
      index.conversations[existingIdx] = entry;
    } else {
      index.conversations.push(entry);
    }

    await writeIndex(index);
  },

  /** 删除会话文件、附件目录和索引条目 */
  async deleteConversation(id: string): Promise<void> {
    const dir = conversationDir(id);
    try {
      await fs.promises.rm(dir, { recursive: true, force: true });
    } catch {
      // 目录可能不存在
    }

    const index = await readIndex();
    index.conversations = index.conversations.filter((c) => c.id !== id);
    await writeIndex(index);
  },

  /** 清空全部会话 */
  async deleteAllConversations(): Promise<void> {
    const index = await readIndex();

    for (const conv of index.conversations) {
      const dir = conversationDir(conv.id);
      try {
        await fs.promises.rm(dir, { recursive: true, force: true });
      } catch {
        // 继续处理其他会话
      }
    }

    await writeIndex({ conversations: [] });
  },

  /** 检查会话是否存在 */
  async conversationExists(id: string): Promise<boolean> {
    return jsonStore.exists(conversationFile(id));
  },
};
