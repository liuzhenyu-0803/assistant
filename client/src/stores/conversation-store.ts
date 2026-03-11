import { create } from 'zustand';
import type { ConversationListItem } from '@assistant/shared';
import {
  fetchConversations,
  createConversation,
  deleteConversation,
  clearAllConversations,
} from '../services/conversation-api';

interface ConversationStore {
  conversations: ConversationListItem[];
  loading: boolean;
  activeId: string | null;

  load: () => Promise<void>;
  create: () => Promise<ConversationListItem>;
  delete: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setActive: (id: string | null) => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  loading: false,
  activeId: null,

  async load() {
    set({ loading: true });
    try {
      const conversations = await fetchConversations();
      set({ conversations, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async create() {
    const detail = await createConversation();
    const item: ConversationListItem = {
      id: detail.id,
      title: detail.title,
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
      lastMessageAt: detail.lastMessageAt,
      messageCount: detail.messageCount,
      revision: detail.revision,
      fork: detail.fork,
    };
    set((state) => ({ conversations: [item, ...state.conversations] }));
    return item;
  },

  async delete(id: string) {
    await deleteConversation(id);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeId: state.activeId === id ? null : state.activeId,
    }));
  },

  async clearAll() {
    await clearAllConversations();
    set({ conversations: [], activeId: null });
  },

  setActive(id: string | null) {
    // 同步更新 activeId（实际导航由路由控制）
    const { conversations } = get();
    if (id && !conversations.find((c) => c.id === id)) {
      set({ activeId: id });
    } else {
      set({ activeId: id });
    }
  },
}));
