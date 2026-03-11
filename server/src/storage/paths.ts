import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
export const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
export const MCP_SERVERS_FILE = path.join(DATA_DIR, 'mcp-servers.json');
export const CONVERSATIONS_INDEX_FILE = path.join(CONVERSATIONS_DIR, 'index.json');
export const SKILLS_DIR = path.join(PROJECT_ROOT, 'skills');

export function conversationDir(conversationId: string): string {
  return path.join(CONVERSATIONS_DIR, conversationId);
}

export function conversationFile(conversationId: string): string {
  return path.join(CONVERSATIONS_DIR, conversationId, 'conversation.json');
}

export function attachmentsDir(conversationId: string): string {
  return path.join(CONVERSATIONS_DIR, conversationId, 'attachments');
}
