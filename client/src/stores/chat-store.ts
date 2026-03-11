import { create } from 'zustand';
import type { Message, MessageStatus, MessageContent, ToolCallRecord } from '@assistant/shared';
import { fetchConversation } from '../services/conversation-api';

interface ChatStore {
  conversationId: string | null;
  revision: number;
  messages: Message[];
  streamingMessageId: string | null;
  streamingContent: string;
  streamingToolCalls: Record<string, ToolCallRecord>;
  isStreaming: boolean;
  loading: boolean;
  error: string | null;

  loadConversation: (id: string) => Promise<void>;
  reset: () => void;
  beginStreaming: (messageId: string) => void;
  appendStreamingDelta: (delta: string) => void;
  startStreamingToolCall: (toolCallId: string, toolName: string, args: Record<string, unknown>) => void;
  endStreamingToolCall: (toolCallId: string, result: string) => void;
  errorStreamingToolCall: (toolCallId: string, error: string) => void;
  commitStreaming: (status: MessageStatus) => void;
  appendMessage: (message: Message) => void;
  appendUserMessage: (message: Message) => void;
  setError: (error: string | null) => void;
  updateRevision: (revision: number) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversationId: null,
  revision: 0,
  messages: [],
  streamingMessageId: null,
  streamingContent: '',
  streamingToolCalls: {},
  isStreaming: false,
  loading: false,
  error: null,

  async loadConversation(id: string) {
    set({
      loading: true,
      error: null,
      conversationId: id,
      messages: [],
      streamingMessageId: null,
      streamingContent: '',
      streamingToolCalls: {},
      isStreaming: false,
      revision: 0,
    });
    try {
      const detail = await fetchConversation(id);
      set({ messages: detail.messages, revision: detail.revision, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : '加载会话失败',
      });
    }
  },

  reset() {
    set({
      conversationId: null,
      revision: 0,
      messages: [],
      streamingMessageId: null,
      streamingContent: '',
      streamingToolCalls: {},
      isStreaming: false,
      loading: false,
      error: null,
    });
  },

  beginStreaming(messageId: string) {
    set({ streamingMessageId: messageId, streamingContent: '', streamingToolCalls: {}, isStreaming: true });
  },

  appendStreamingDelta(delta: string) {
    set((state) => ({ streamingContent: state.streamingContent + delta }));
  },

  startStreamingToolCall(toolCallId: string, toolName: string, args: Record<string, unknown>) {
    set((state) => ({
      streamingToolCalls: {
        ...state.streamingToolCalls,
        [toolCallId]: {
          id: toolCallId,
          toolName,
          serverId: '',
          arguments: args,
          status: 'running',
          startedAt: new Date().toISOString(),
        },
      },
    }));
  },

  endStreamingToolCall(toolCallId: string, result: string) {
    set((state) => {
      const existing = state.streamingToolCalls[toolCallId];
      if (!existing) return state;
      return {
        streamingToolCalls: {
          ...state.streamingToolCalls,
          [toolCallId]: {
            ...existing,
            status: 'success',
            result,
            completedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  errorStreamingToolCall(toolCallId: string, error: string) {
    set((state) => {
      const existing = state.streamingToolCalls[toolCallId];
      if (!existing) return state;
      return {
        streamingToolCalls: {
          ...state.streamingToolCalls,
          [toolCallId]: {
            ...existing,
            status: 'failed',
            error,
            completedAt: new Date().toISOString(),
          },
        },
      };
    });
  },

  commitStreaming(status: MessageStatus) {
    const { streamingMessageId, streamingContent, streamingToolCalls, messages } = get();
    if (!streamingMessageId) return;

    const content: MessageContent[] = [];

    // Tool calls come before text in display order
    for (const tc of Object.values(streamingToolCalls)) {
      content.push({ type: 'tool-call', toolCall: tc });
    }

    if (streamingContent) {
      content.push({ type: 'text', text: streamingContent });
    }

    const newMessage: Message = {
      id: streamingMessageId,
      role: 'assistant',
      content,
      status,
      createdAt: new Date().toISOString(),
    };

    set({
      messages: [...messages, newMessage],
      streamingMessageId: null,
      streamingContent: '',
      streamingToolCalls: {},
      isStreaming: false,
    });
  },

  appendMessage(message: Message) {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  appendUserMessage(message: Message) {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setError(error: string | null) {
    set({ error, isStreaming: false });
  },

  updateRevision(revision: number) {
    set({ revision });
  },
}));
