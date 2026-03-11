import { useState } from 'react';
import type { AttachmentRef } from '@assistant/shared';
import { getAttachmentUrl } from '../../services/attachment-api';
import { ImagePreview } from './ImagePreview';
import styles from './ImageThumbnail.module.css';

interface ImageThumbnailProps {
  attachment: AttachmentRef;
  conversationId: string;
}

export function ImageThumbnail({ attachment, conversationId }: ImageThumbnailProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const url = getAttachmentUrl(conversationId, attachment.filename);

  return (
    <>
      <div className={styles.wrapper} onClick={() => setPreviewOpen(true)} title={attachment.originalName}>
        <img
          src={url}
          alt={attachment.originalName}
          className={styles.thumbnail}
          loading="lazy"
        />
      </div>
      {previewOpen && (
        <ImagePreview
          url={url}
          name={attachment.originalName}
          onClose={() => setPreviewOpen(false)}
        />
      )}
    </>
  );
}
