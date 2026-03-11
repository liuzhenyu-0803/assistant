import { create } from 'zustand';
import type { AttachmentRef } from '@assistant/shared';
import { uploadAttachment, deleteAttachment } from '../services/attachment-api';
import { showToast } from '../components/common/Toast';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface AttachmentStore {
  conversationId: string | null;
  pendingAttachments: AttachmentRef[];

  setConversationId: (id: string | null) => void;
  addFiles: (files: File[]) => Promise<void>;
  removeAttachment: (id: string) => Promise<void>;
  clearAll: () => void;
  getAttachmentIds: () => string[];
}

export const useAttachmentStore = create<AttachmentStore>((set, get) => ({
  conversationId: null,
  pendingAttachments: [],

  setConversationId(id: string | null) {
    set({ conversationId: id, pendingAttachments: [] });
  },

  async addFiles(files: File[]) {
    const { conversationId } = get();
    if (!conversationId) return;

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`文件 "${file.name}" 超过 100MB 限制`, 'error');
        continue;
      }

      try {
        const ref = await uploadAttachment(conversationId, file);
        set((state) => ({ pendingAttachments: [...state.pendingAttachments, ref] }));
      } catch (err) {
        showToast(err instanceof Error ? err.message : `上传 "${file.name}" 失败`, 'error');
      }
    }
  },

  async removeAttachment(id: string) {
    const { conversationId } = get();
    if (!conversationId) return;

    try {
      await deleteAttachment(conversationId, id);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除附件失败', 'error');
      return;
    }

    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter((a) => a.id !== id),
    }));
  },

  clearAll() {
    set({ pendingAttachments: [] });
  },

  getAttachmentIds() {
    return get().pendingAttachments.map((a) => a.id);
  },
}));
