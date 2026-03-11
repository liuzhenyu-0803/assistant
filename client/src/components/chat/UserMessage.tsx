import { useParams } from 'react-router-dom';
import type { Message, TextContent, AttachmentContent } from '@assistant/shared';
import { ImageThumbnail } from '../attachments/ImageThumbnail';
import { FileCard } from '../attachments/FileCard';
import styles from './UserMessage.module.css';

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  const { id: conversationId } = useParams<{ id: string }>();
  const textParts = message.content.filter((c): c is TextContent => c.type === 'text');
  const attachmentParts = message.content.filter((c): c is AttachmentContent => c.type === 'attachment');

  const imageParts = attachmentParts.filter((a) => a.attachment.mimeType.startsWith('image/'));
  const fileParts = attachmentParts.filter((a) => !a.attachment.mimeType.startsWith('image/'));

  return (
    <div className={styles.wrapper}>
      {imageParts.length > 0 && conversationId && (
        <div className={styles.images}>
          {imageParts.map((a) => (
            <ImageThumbnail
              key={a.attachment.id}
              attachment={a.attachment}
              conversationId={conversationId}
            />
          ))}
        </div>
      )}
      {fileParts.length > 0 && conversationId && (
        <div className={styles.files}>
          {fileParts.map((a) => (
            <FileCard
              key={a.attachment.id}
              attachment={a.attachment}
              conversationId={conversationId}
            />
          ))}
        </div>
      )}
      {textParts.map((t, i) => (
        <div key={i} className={styles.text}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
