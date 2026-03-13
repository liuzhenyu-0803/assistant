import type { Message, MessageStatus, TextContent, ToolCallContent, SubAgentContent, SubAgentRecord } from '@assistant/shared';
import type { ToolCallRecord } from '@assistant/shared';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallBlock } from './ToolCallBlock';
import { StatusBadge } from '../common/StatusBadge';
import styles from './AssistantMessage.module.css';

type ReasoningStatus = MessageStatus | 'streaming';

interface AssistantMessageProps {
  message: Message;
  /** 流式输出时传入正在生成的内容，优先显示 */
  streamingContent?: string;
  /** 流式思考过程（streaming 期间） */
  streamingReasoning?: string;
  /** 思考过程当前状态 */
  reasoningStatus?: ReasoningStatus;
  /** 流式工具调用状态（streaming 期间） */
  streamingToolCalls?: ToolCallRecord[];
  /** 流式子代理状态（streaming 期间） */
  streamingSubAgents?: SubAgentRecord[];
}

export function AssistantMessage({
  message,
  streamingContent,
  streamingReasoning,
  reasoningStatus,
  streamingToolCalls,
  streamingSubAgents,
}: AssistantMessageProps) {
  const textParts = message.content.filter((c): c is TextContent => c.type === 'text');
  const toolCallParts = message.content.filter((c): c is ToolCallContent => c.type === 'tool-call');
  const subAgentParts = message.content.filter((c): c is SubAgentContent => c.type === 'sub-agent');

  const failedErrorText =
    message.status === 'failed'
      ? textParts
          .map((t) => t.text)
          .find((text) => text.trim().startsWith('生成失败：'))
      : undefined;

  const normalTextParts =
    message.status === 'failed'
      ? textParts.filter((t) => t.text !== failedErrorText)
      : textParts;

  // 流式内容优先展示，否则展示 committed 内容
  const displayText =
    streamingContent !== undefined
      ? streamingContent
      : normalTextParts.map((t) => t.text).join('');

  // 流式工具调用：streaming 期间显示 streamingToolCalls，否则显示 committed toolCallParts
  const displayToolCalls: ToolCallRecord[] =
    streamingToolCalls !== undefined
      ? streamingToolCalls
      : toolCallParts.map((tc) => tc.toolCall);

  const displaySubAgents: SubAgentRecord[] =
    streamingSubAgents !== undefined
      ? streamingSubAgents
      : subAgentParts.map((sa) => sa.subAgent);

  const displayReasoning = streamingReasoning?.trim() ?? '';
  const isStreamingReasoning = reasoningStatus === 'streaming';

  return (
    <div className={styles.wrapper}>
      {displayReasoning && (
        <details className={styles.reasoningPanel} open>
          <summary className={styles.reasoningSummary}>
            {isStreamingReasoning ? '思考过程（进行中）' : '思考过程'}
          </summary>
          <div className={styles.reasoningContent}>{streamingReasoning}</div>
        </details>
      )}

      {displayToolCalls.map((tc) => (
        <ToolCallBlock key={tc.id} toolCall={tc} />
      ))}

      {displaySubAgents.map((subAgent) => (
        <div key={subAgent.id} className={styles.subAgent}>
          <span className={styles.subAgentIcon}>🤖</span>
          <span className={styles.subAgentTask}>{subAgent.task}</span>
          <span className={`${styles.subAgentStatus} ${styles[subAgent.status]}`}>
            {subAgent.status === 'running' ? '执行中' :
             subAgent.status === 'success' ? '完成' :
             subAgent.status === 'failed' ? '失败' :
             subAgent.status === 'timeout' ? '超时' : '已取消'}
          </span>
        </div>
      ))}

      {displayText && <MarkdownRenderer content={displayText} />}

      {message.status === 'interrupted' && (
        <div className={styles.statusRow}>
          <StatusBadge status="interrupted" label="已中断" />
        </div>
      )}
      {message.status === 'failed' && (
        <>
          <div className={styles.statusRow}>
            <StatusBadge status="failed" label="生成失败" />
          </div>
          {failedErrorText && <div className={styles.errorMessage}>{failedErrorText}</div>}
        </>
      )}

      {streamingContent !== undefined && (
        <span className={styles.cursor} aria-hidden />
      )}
    </div>
  );
}
