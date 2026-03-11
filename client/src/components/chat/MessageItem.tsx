import type { Message, ToolCallRecord } from '@assistant/shared';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import styles from './MessageItem.module.css';

interface MessageItemProps {
  message: Message;
  streamingContent?: string;
  streamingToolCalls?: ToolCallRecord[];
}

export function MessageItem({ message, streamingContent, streamingToolCalls }: MessageItemProps) {
  return (
    <div className={`${styles.item} ${styles[message.role]}`}>
      <div className={styles.avatar}>
        {message.role === 'user' ? '你' : 'AI'}
      </div>
      <div className={styles.content}>
        {message.role === 'user' ? (
          <UserMessage message={message} />
        ) : (
          <AssistantMessage
            message={message}
            streamingContent={streamingContent}
            streamingToolCalls={streamingToolCalls}
          />
        )}
      </div>
    </div>
  );
}
