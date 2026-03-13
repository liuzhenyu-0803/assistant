import fs from 'node:fs';
import path from 'node:path';
import { createAttachmentId } from '@assistant/shared';
import type { AttachmentRef } from '@assistant/shared';
import { CONVERSATIONS_DIR, attachmentsDir, conversationFile } from '../storage/paths.js';
import { jsonStore } from '../storage/json-store.js';
import type { ConversationData } from '../storage/conversation-store.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

function stagingFilePath(conversationId: string): string {
  return path.join(attachmentsDir(conversationId), '_staging.json');
}

async function readStaging(conversationId: string): Promise<Record<string, AttachmentRef>> {
  const data = await jsonStore.read<Record<string, AttachmentRef>>(stagingFilePath(conversationId));
  return data ?? {};
}

async function writeStaging(
  conversationId: string,
  staging: Record<string, AttachmentRef>,
): Promise<void> {
  await jsonStore.write(stagingFilePath(conversationId), staging);
}

function getExtension(originalName: string): string {
  const ext = path.extname(originalName);
  return ext || '';
}

const orphanCleanupTimers = new Map<string, NodeJS.Timeout>();

function cancelScheduledCleanup(conversationId: string): void {
  const timer = orphanCleanupTimers.get(conversationId);
  if (timer) {
    clearTimeout(timer);
    orphanCleanupTimers.delete(conversationId);
  }
}

export const attachmentService = {
  /** 上传附件到会话附件目录，返回 AttachmentRef (status=staged) */
  async uploadAttachment(
    conversationId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ): Promise<AttachmentRef> {
    const attDir = attachmentsDir(conversationId);
    await fs.promises.mkdir(attDir, { recursive: true });

    const id = createAttachmentId();
    const ext = getExtension(file.originalname);
    const filename = `${id.replace('att_', '')}${ext}`;
    const filePath = path.join(attDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const ref: AttachmentRef = {
      id,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      status: 'staged',
      createdAt: new Date().toISOString(),
    };

    // 持久化暂存元数据，以便发送消息时查找
    const staging = await readStaging(conversationId);
    staging[id] = ref;
    await writeStaging(conversationId, staging);

    logger.info(
      `Uploaded attachment: ${id} (${file.originalname}) to conversation ${conversationId}`,
    );
    return ref;
  },

  /** 删除 staged 状态的附件 */
  async deleteAttachment(conversationId: string, attachmentId: string): Promise<void> {
    // 检查附件是否已被消息引用
    const conv = await jsonStore.read<ConversationData>(conversationFile(conversationId));
    if (conv) {
      for (const msg of conv.messages) {
        for (const content of msg.content) {
          if (content.type === 'attachment' && content.attachment.id === attachmentId) {
            throw new AppError('INVALID_REQUEST', '已绑定消息的附件不可删除');
          }
        }
      }
    }

    // 从暂存元数据中校验并移除
    const staging = await readStaging(conversationId);
    const stagedAttachment = staging[attachmentId];
    if (!stagedAttachment) {
      throw new AppError('NOT_FOUND', '附件不存在或已删除');
    }

    delete staging[attachmentId];
    await writeStaging(conversationId, staging);

    // 按 staging 记录的文件名精确删除文件
    const filePath = path.join(attachmentsDir(conversationId), stagedAttachment.filename);
    try {
      await fs.promises.unlink(filePath);
      logger.info(`Deleted attachment: ${attachmentId}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  },

  /** 通过 attachmentId 列表查找暂存的 AttachmentRef 列表 */
  async getStagedAttachments(
    conversationId: string,
    attachmentIds: string[],
  ): Promise<AttachmentRef[]> {
    if (attachmentIds.length === 0) return [];
    const staging = await readStaging(conversationId);
    return attachmentIds.map((id) => {
      const ref = staging[id];
      if (!ref) throw new AppError('NOT_FOUND', `附件 ${id} 不存在或已过期`);
      return ref;
    });
  },

  /** 将附件状态更新为 attached，并从暂存元数据中移除 */
  async bindAttachments(
    conversationId: string,
    attachmentRefs: AttachmentRef[],
  ): Promise<AttachmentRef[]> {
    const staging = await readStaging(conversationId);
    const bound = attachmentRefs.map((att) => {
      delete staging[att.id];
      return { ...att, status: 'attached' as const };
    });
    await writeStaging(conversationId, staging);
    return bound;
  },

  /** 返回附件文件的磁盘路径 */
  getAttachmentPath(conversationId: string, filename: string): string {
    return path.join(attachmentsDir(conversationId), filename);
  },

  /** 清理会话中未绑定消息的暂存附件 */
  async cleanOrphanAttachments(conversationId: string): Promise<void> {
    cancelScheduledCleanup(conversationId);
    const attDir = attachmentsDir(conversationId);
    try {
      await fs.promises.access(attDir);
    } catch {
      return;
    }

    const conv = await jsonStore.read<ConversationData>(conversationFile(conversationId));
    if (!conv) return;

    const referencedFiles = new Set<string>();
    for (const msg of conv.messages) {
      for (const content of msg.content) {
        if (content.type === 'attachment') {
          referencedFiles.add(content.attachment.filename);
        }
      }
    }

    const files = await fs.promises.readdir(attDir);
    for (const file of files) {
      if (file === '_staging.json') continue;
      if (!referencedFiles.has(file)) {
        try {
          await fs.promises.unlink(path.join(attDir, file));
          logger.info(`Cleaned orphan attachment: ${file} in conversation ${conversationId}`);
        } catch {
          // ignore and continue
        }
      }
    }

    await writeStaging(conversationId, {});
  },

  async cleanAllOrphanAttachments(): Promise<void> {
    const entries = await fs.promises.readdir(CONVERSATIONS_DIR, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      try {
        await this.cleanOrphanAttachments(entry.name);
      } catch (error) {
        logger.warn(`Failed to clean orphan attachments for conversation ${entry.name}: ${String(error)}`);
      }
    }
  },

  scheduleOrphanCleanup(conversationId: string): void {
    cancelScheduledCleanup(conversationId);
    orphanCleanupTimers.set(
      conversationId,
      setTimeout(() => {
        void this.cleanOrphanAttachments(conversationId).catch((error: unknown) => {
          logger.warn(`Scheduled orphan cleanup failed for ${conversationId}: ${String(error)}`);
        });
      }, 5 * 60 * 1000),
    );
  },

  cancelOrphanCleanup(conversationId: string): void {
    cancelScheduledCleanup(conversationId);
  },
};
