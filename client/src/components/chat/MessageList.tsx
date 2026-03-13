import { useEffect, useRef } from 'react';
import type { Message, MessageStatus, ToolCallRecord, SubAgentRecord } from '@assistant/shared';
import { MessageItem } from './MessageItem';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: Message[];
  streamingMessageId: string | null;
  streamingContent: string;
  streamingReasoning?: string;
  streamingReasoningStatus: MessageStatus | 'streaming';
  reasoningByMessageId: Record<string, { text: string; status: MessageStatus }>;
  streamingToolCalls?: ToolCallRecord[];
  streamingSubAgents?: SubAgentRecord[];
}

export function MessageList({
  messages,
  streamingMessageId,
  streamingContent,
  streamingReasoning,
  streamingReasoningStatus,
  reasoningByMessageId,
  streamingToolCalls,
  streamingSubAgents,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent, streamingReasoning, streamingToolCalls?.length, streamingSubAgents?.length]);

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
        <MessageItem
          key={msg.id}
          message={msg}
          streamingReasoning={reasoningByMessageId[msg.id]?.text}
          reasoningStatus={reasoningByMessageId[msg.id]?.status}
        />
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
          streamingReasoning={streamingReasoning}
          reasoningStatus={streamingReasoningStatus}
          streamingToolCalls={streamingToolCalls}
          streamingSubAgents={streamingSubAgents}
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
