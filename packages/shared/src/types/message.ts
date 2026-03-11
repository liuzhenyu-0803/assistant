import type { AttachmentRef } from './attachment.js';
import type { ToolCallRecord } from './tool-call.js';
import type { SubAgentRecord } from './sub-agent.js';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: MessageContent[];
  status: MessageStatus;
  runId?: string;
  createdAt: string;
}

export type MessageStatus = 'completed' | 'interrupted' | 'failed';

export type MessageContent =
  | TextContent
  | AttachmentContent
  | ToolCallContent
  | SubAgentContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface AttachmentContent {
  type: 'attachment';
  attachment: AttachmentRef;
}

export interface ToolCallContent {
  type: 'tool-call';
  toolCall: ToolCallRecord;
}

export interface SubAgentContent {
  type: 'sub-agent';
  subAgent: SubAgentRecord;
}
