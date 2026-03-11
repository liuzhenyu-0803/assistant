import type { AttachmentRef } from '@assistant/shared';
import styles from './AttachmentItem.module.css';

interface AttachmentItemProps {
  attachment: AttachmentRef;
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function AttachmentItem({ attachment, onRemove }: AttachmentItemProps) {
  return (
    <div className={styles.item}>
      <span className={styles.icon}>{isImage(attachment.mimeType) ? '🖼' : '📎'}</span>
      <div className={styles.info}>
        <span className={styles.name} title={attachment.originalName}>
          {attachment.originalName}
        </span>
        <span className={styles.size}>{formatSize(attachment.size)}</span>
      </div>
      <button
        className={styles.removeButton}
        onClick={() => onRemove(attachment.id)}
        title="移除附件"
        type="button"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
