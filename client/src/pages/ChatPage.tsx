import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore } from '../stores/chat-store';
import { useAttachmentStore } from '../stores/attachment-store';
import { MessageList } from '../components/chat/MessageList';
import { ChatInput } from '../components/input/ChatInput';
import { useSSEStream } from '../hooks/useSSEStream';
import { sendMessage, stopRun } from '../services/message-api';
import { useConversationStore } from '../stores/conversation-store';
import { showToast } from '../components/common/Toast';
import type {
  SSERunStartEvent,
  SSETextDeltaEvent,
  SSEReasoningDeltaEvent,
  SSEReasoningEndEvent,
  SSEDoneEvent,
  SSEErrorEvent,
  SSEToolCallStartEvent,
  SSEToolCallEndEvent,
  SSEToolCallErrorEvent,
  SSESubAgentStartEvent,
  SSESubAgentDeltaEvent,
  SSESubAgentEndEvent,
  SSESubAgentErrorEvent,
} from '@assistant/shared';
import styles from './ChatPage.module.css';

export function ChatPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const {
    messages,
    revision,
    streamingMessageId,
    streamingContent,
    streamingReasoning,
    streamingReasoningStatus,
    reasoningByMessageId,
    streamingToolCalls,
    streamingSubAgents,
    isStreaming,
    loading,
    error,
    loadConversation,
    reset,
    beginStreaming,
    appendStreamingDelta,
    appendStreamingReasoning,
    endStreamingReasoning,
    startStreamingToolCall,
    endStreamingToolCall,
    errorStreamingToolCall,
    startStreamingSubAgent,
    appendStreamingSubAgentDelta,
    endStreamingSubAgent,
    errorStreamingSubAgent,
    commitStreaming,
    appendUserMessage,
    updateRevision,
  } = useChatStore();

  const { setConversationId, pendingAttachments, getAttachmentIds, clearAll } = useAttachmentStore();
  const forkConversation = useConversationStore((state) => state.fork);

  const [inputText, setInputText] = useState('');
  const { connect, disconnect } = useSSEStream();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (id) {
      loadConversation(id);
      setConversationId(id);
    } else {
      reset();
      setConversationId(null);
    }
    return () => {
      disconnect();
    };
  }, [id]);

  const handleSend = useCallback(async () => {
    if (!id || (!inputText.trim() && pendingAttachments.length === 0) || isStreaming) return;

    const text = inputText.trim();
    const attachmentIds = getAttachmentIds();
    const pendingAttachmentSnapshot = [...pendingAttachments];

    // 构造请求 content
    const content: Array<{ type: 'text'; text: string } | { type: 'attachment'; attachmentId: string }> = [];
    for (const aid of attachmentIds) {
      content.push({ type: 'attachment', attachmentId: aid });
    }
    if (text) content.push({ type: 'text', text });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await sendMessage(id, { revision, content }, controller.signal);

      if (!response.ok) {
        let code = 'UNKNOWN_ERROR';
        let message = `请求失败 (${response.status})`;
        try {
          const body = await response.json();
          if (body.error?.code) code = body.error.code;
          if (body.error?.message) message = body.error.message;
        } catch {
          // ignore
        }

        if (code === 'CONFLICT') {
          const lastMessage = messages[messages.length - 1];
          if (!lastMessage) {
            showToast('会话已在其他标签页更新，请刷新后重试', 'error');
            return;
          }

          try {
            const forked = await forkConversation(id, lastMessage.id, revision);
            navigate(`/chat/${forked.id}`);
            setConversationId(forked.id);
            setInputText(text);
            showToast('会话已被其他标签页更新，已自动创建分支会话', 'success');
          } catch {
            showToast('会话已在其他标签页更新，请刷新后重试', 'error');
          }
        } else if (code === 'RUN_ACTIVE') {
          showToast('当前会话正在生成中，请等待完成', 'error');
        } else if (code === 'CONFIG_INCOMPLETE') {
          showToast('模型配置不完整，请先前往设置页面完成配置', 'error');
        } else {
          showToast(message, 'error');
        }
        return;
      }

      // 请求被接受后再做乐观更新和清空草稿
      appendUserMessage({
        id: `user_${Date.now()}`,
        role: 'user',
        content: content.map((c) =>
          c.type === 'text'
            ? { type: 'text', text: c.text }
            : {
                type: 'attachment',
                attachment: pendingAttachmentSnapshot.find((a) => a.id === c.attachmentId) ?? {
                  id: c.attachmentId,
                  filename: '',
                  originalName: '',
                  mimeType: 'application/octet-stream',
                  size: 0,
                  status: 'staged' as const,
                  createdAt: new Date().toISOString(),
                },
              },
        ),
        status: 'completed',
        createdAt: new Date().toISOString(),
      });
      setInputText('');
      clearAll();

      connect(
        response,
        (eventType, data) => {
          if (eventType === 'ping') return;

          if (eventType === 'run-start') {
            const evt = data as SSERunStartEvent;
            beginStreaming(evt.messageId);
          } else if (eventType === 'text-delta') {
            const evt = data as SSETextDeltaEvent;
            appendStreamingDelta(evt.delta);
          } else if (eventType === 'reasoning-delta') {
            const evt = data as SSEReasoningDeltaEvent;
            appendStreamingReasoning(evt.delta);
          } else if (eventType === 'reasoning-end') {
            const _evt = data as SSEReasoningEndEvent;
            endStreamingReasoning();
          } else if (eventType === 'tool-call-start') {
            const evt = data as SSEToolCallStartEvent;
            startStreamingToolCall(evt.toolCallId, evt.toolName, evt.arguments);
          } else if (eventType === 'tool-call-end') {
            const evt = data as SSEToolCallEndEvent;
            endStreamingToolCall(evt.toolCallId, evt.result);
          } else if (eventType === 'tool-call-error') {
            const evt = data as SSEToolCallErrorEvent;
            errorStreamingToolCall(evt.toolCallId, evt.error);
          } else if (eventType === 'sub-agent-start') {
            const evt = data as SSESubAgentStartEvent;
            startStreamingSubAgent(evt.subAgentId, evt.task);
          } else if (eventType === 'sub-agent-delta') {
            const evt = data as SSESubAgentDeltaEvent;
            appendStreamingSubAgentDelta(evt.subAgentId, evt.delta);
          } else if (eventType === 'sub-agent-end') {
            const evt = data as SSESubAgentEndEvent;
            endStreamingSubAgent(evt.subAgentId, evt.summary, evt.detail);
          } else if (eventType === 'sub-agent-error') {
            const evt = data as SSESubAgentErrorEvent;
            errorStreamingSubAgent(evt.subAgentId, evt.error);
          } else if (eventType === 'done') {
            const evt = data as SSEDoneEvent;
            commitStreaming(evt.status === 'completed' ? 'completed' : 'interrupted');
            updateRevision(evt.revision);
          } else if (eventType === 'error') {
            const evt = data as SSEErrorEvent;
            commitStreaming('failed');
            updateRevision(evt.revision);
            showToast(`生成失败: ${evt.message}`, 'error');
          }
        },
        () => {
          abortControllerRef.current = null;
        },
      );
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      showToast(err instanceof Error ? err.message : '发送失败', 'error');
    }
  }, [id, navigate, messages, inputText, pendingAttachments, revision, isStreaming, appendUserMessage, beginStreaming, appendStreamingDelta, appendStreamingReasoning, endStreamingReasoning, startStreamingToolCall, endStreamingToolCall, errorStreamingToolCall, startStreamingSubAgent, appendStreamingSubAgentDelta, endStreamingSubAgent, errorStreamingSubAgent, commitStreaming, updateRevision, connect, getAttachmentIds, clearAll, setConversationId, forkConversation]);

  const handleStop = useCallback(async () => {
    if (!id) return;
    try {
      disconnect();
      await stopRun(id);
    } catch {
      // ignore
    }
  }, [id, disconnect]);

  if (!id) {
    return (
      <div className={styles.empty}>
        <p>请从左侧选择或新建一个对话</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.empty}>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.empty}>
        <p className={styles.errorText}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <MessageList
        messages={messages}
        streamingMessageId={streamingMessageId}
        streamingContent={streamingContent}
        streamingReasoning={streamingReasoning}
        streamingReasoningStatus={streamingReasoningStatus}
        reasoningByMessageId={reasoningByMessageId}
        streamingToolCalls={Object.values(streamingToolCalls)}
        streamingSubAgents={Object.values(streamingSubAgents)}
      />
      <ChatInput
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
