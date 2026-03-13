import type { Message, MessageStatus, ToolCallRecord, SubAgentRecord } from '@assistant/shared';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import styles from './MessageItem.module.css';

type ReasoningStatus = MessageStatus | 'streaming';

interface MessageItemProps {
  message: Message;
  streamingContent?: string;
  streamingReasoning?: string;
  reasoningStatus?: ReasoningStatus;
  streamingToolCalls?: ToolCallRecord[];
  streamingSubAgents?: SubAgentRecord[];
}

export function MessageItem({
  message,
  streamingContent,
  streamingReasoning,
  reasoningStatus,
  streamingToolCalls,
  streamingSubAgents,
}: MessageItemProps) {
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
            streamingReasoning={streamingReasoning}
            reasoningStatus={reasoningStatus}
            streamingToolCalls={streamingToolCalls}
            streamingSubAgents={streamingSubAgents}
          />
        )}
      </div>
    </div>
  );
}
