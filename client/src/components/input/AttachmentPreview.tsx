import type { AttachmentRef } from '@assistant/shared';
import { AttachmentItem } from './AttachmentItem';
import styles from './AttachmentPreview.module.css';

interface AttachmentPreviewProps {
  attachments: AttachmentRef[];
  onRemove: (id: string) => void;
}

export function AttachmentPreview({ attachments, onRemove }: AttachmentPreviewProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={styles.container}>
      {attachments.map((att) => (
        <AttachmentItem key={att.id} attachment={att} onRemove={onRemove} />
      ))}
    </div>
  );
}
