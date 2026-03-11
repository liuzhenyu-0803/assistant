export interface Conversation {
  id: string;
  title: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  fork: Fork | null;
  summary: Summary | null;
}

export interface Fork {
  sourceConversationId: string;
  sourceMessageId: string;
  sourceRevision: number;
}

export interface Summary {
  text: string;
  upToMessageId: string;
  createdAt: string;
}
