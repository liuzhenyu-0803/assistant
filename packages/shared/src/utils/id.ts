import { nanoid } from 'nanoid';

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(12)}`;
}

export const createConversationId = () => generateId('conv');
export const createMessageId = () => generateId('msg');
export const createAttachmentId = () => generateId('att');
export const createRunId = () => generateId('run');
export const createToolCallId = () => generateId('tc');
export const createSubAgentId = () => generateId('sa');
export const createMCPServerId = () => generateId('mcp');
