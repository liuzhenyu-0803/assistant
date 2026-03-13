import type { MessageContent } from './message.js';
import type { AttachmentRef } from './attachment.js';
import type { Conversation, Fork, Summary } from './conversation.js';
import type { Message } from './message.js';
import type { MCPServerConfig } from './mcp.js';
import type { Settings } from './settings.js';
import type { SkillMeta } from './skill.js';

// --- API Response Wrappers ---

export interface ApiResponse<T> {
  data: T;
}

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
  };
}

export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RUN_ACTIVE'
  | 'CONFIG_INCOMPLETE'
  | 'INTERNAL_ERROR';

// --- Conversation API ---

export interface ConversationListItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  messageCount: number;
  revision: number;
  fork: Fork | null;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}

// --- Message API ---

export interface SendMessageRequest {
  revision: number;
  content: SendMessageContent[];
}

export type SendMessageContent =
  | { type: 'text'; text: string }
  | { type: 'attachment'; attachmentId: string };

// --- Fork API ---

export interface ForkRequest {
  upToMessageId: string;
  revision: number;
}

export interface ForkResponse extends ConversationDetail {}

// --- Attachment API ---

export interface UploadAttachmentResponse extends AttachmentRef {}

// --- Settings API ---

export type SettingsResponse = Settings;
export type UpdateSettingsRequest = Settings;

export interface SubAgentConfigTextResponse {
  content: string;
}

export interface UpdateSubAgentConfigTextRequest {
  content: string;
}

// --- MCP API ---

export interface MCPServerWithStatus extends MCPServerConfig {
  status: 'connected' | 'disconnected' | 'error';
  errorMessage?: string | null;
}

export interface UpdateMCPServersRequest {
  servers: MCPServerConfig[];
}

export interface MCPConfigTextResponse {
  content: string;
}

export interface UpdateMCPConfigTextRequest {
  content: string;
}

export interface MCPToolInfo {
  serverId: string;
  serverName: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// --- Skills API ---

export type SkillListItem = Pick<SkillMeta, 'name' | 'description' | 'match' | 'path'>;

// --- Stop API ---

export interface StopResponse {
  stopped: boolean;
}

// --- SSE Events ---

export interface SSERunStartEvent {
  runId: string;
  /** 流式 assistant 占位消息的 ID */
  messageId: string;
}

export interface SSEDoneEvent {
  runId: string;
  status: 'completed' | 'interrupted';
  revision: number;
}

export interface SSEErrorEvent {
  runId: string;
  code: string;
  message: string;
  revision: number;
}

export interface SSETextDeltaEvent {
  delta: string;
}

export interface SSEReasoningDeltaEvent {
  delta: string;
}

export interface SSEReasoningEndEvent {
  status: 'completed';
}

export interface SSEToolCallStartEvent {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

export interface SSEToolCallEndEvent {
  toolCallId: string;
  result: string;
  status: 'success';
}

export interface SSEToolCallErrorEvent {
  toolCallId: string;
  error: string;
  status: 'failed';
}

export interface SSESubAgentStartEvent {
  subAgentId: string;
  task: string;
}

export interface SSESubAgentDeltaEvent {
  subAgentId: string;
  delta: string;
}

export interface SSESubAgentEndEvent {
  subAgentId: string;
  summary: string;
  status: 'success';
  detail: string;
}

export interface SSESubAgentErrorEvent {
  subAgentId: string;
  error: string;
  status: 'failed';
}

export interface SSESummaryStartEvent {
  upToMessageId: string;
}

export interface SSESummaryEndEvent {
  upToMessageId: string;
  status: 'success';
}

export interface SSESummaryErrorEvent {
  upToMessageId: string;
  message: string;
}

export type SSEEventType =
  | 'run-start'
  | 'done'
  | 'error'
  | 'text-delta'
  | 'reasoning-delta'
  | 'reasoning-end'
  | 'tool-call-start'
  | 'tool-call-end'
  | 'tool-call-error'
  | 'sub-agent-start'
  | 'sub-agent-delta'
  | 'sub-agent-end'
  | 'sub-agent-error'
  | 'summary-start'
  | 'summary-end'
  | 'summary-error'
  | 'ping';
