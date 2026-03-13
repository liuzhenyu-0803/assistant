import type { ConversationListItem, ConversationDetail, ForkRequest } from '@assistant/shared';
import { apiGet, apiPost, apiDelete } from './api';

export async function fetchConversations(): Promise<ConversationListItem[]> {
  return apiGet<ConversationListItem[]>('/conversations');
}

export async function fetchConversation(id: string): Promise<ConversationDetail> {
  return apiGet<ConversationDetail>(`/conversations/${id}`);
}

export async function createConversation(): Promise<ConversationDetail> {
  return apiPost<ConversationDetail>('/conversations');
}

export async function forkConversation(id: string, request: ForkRequest): Promise<ConversationDetail> {
  return apiPost<ConversationDetail>(`/conversations/${id}/fork`, request);
}

export async function deleteConversation(id: string): Promise<void> {
  return apiDelete(`/conversations/${id}`);
}

export async function clearAllConversations(): Promise<void> {
  return apiDelete('/conversations');
}
