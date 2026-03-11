import type { AttachmentRef } from '@assistant/shared';
import { getAttachmentUrl } from '../../services/attachment-api';
import styles from './FileCard.module.css';

interface FileCardProps {
  attachment: AttachmentRef;
  conversationId: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('text/')) return '📃';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜';
  if (mimeType.includes('audio/')) return '🎵';
  if (mimeType.includes('video/')) return '🎬';
  return '📎';
}

export function FileCard({ attachment, conversationId }: FileCardProps) {
  const url = getAttachmentUrl(conversationId, attachment.filename);

  return (
    <a
      href={url}
      download={attachment.originalName}
      className={styles.card}
      title={`下载 ${attachment.originalName}`}
    >
      <span className={styles.icon}>{getFileIcon(attachment.mimeType)}</span>
      <div className={styles.info}>
        <span className={styles.name}>{attachment.originalName}</span>
        <span className={styles.size}>{formatSize(attachment.size)}</span>
      </div>
      <span className={styles.download} title="下载">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </span>
    </a>
  );
}
