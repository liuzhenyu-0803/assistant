import { useEffect, useRef } from 'react';
import type { Message, ToolCallRecord } from '@assistant/shared';
import { MessageItem } from './MessageItem';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  streamingMessageId: string | null;
  streamingContent: string;
  streamingToolCalls?: ToolCallRecord[];
}

export function MessageList({ messages, streamingMessageId, streamingContent, streamingToolCalls }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent, streamingToolCalls?.length]);

  if (messages.length === 0 && !streamingMessageId) {
    return (
      <div className={styles.empty}>
        <p>开始对话吧</p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} />
      ))}

      {/* 流式中的助手消息 */}
      {streamingMessageId && (
        <MessageItem
          key={streamingMessageId}
          message={{
            id: streamingMessageId,
            role: 'assistant',
            content: [],
            status: 'completed',
            createdAt: new Date().toISOString(),
          }}
          streamingContent={streamingContent}
          streamingToolCalls={streamingToolCalls}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
