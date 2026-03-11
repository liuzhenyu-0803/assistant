import type { Message, TextContent, ToolCallContent, SubAgentContent } from '@assistant/shared';
import type { ToolCallRecord } from '@assistant/shared';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ToolCallBlock } from './ToolCallBlock';
import { StatusBadge } from '../common/StatusBadge';
import styles from './AssistantMessage.module.css';

interface AssistantMessageProps {
  message: Message;
  /** 流式输出时传入正在生成的内容，优先显示 */
  streamingContent?: string;
  /** 流式工具调用状态（streaming 期间） */
  streamingToolCalls?: ToolCallRecord[];
}

export function AssistantMessage({ message, streamingContent, streamingToolCalls }: AssistantMessageProps) {
  const textParts = message.content.filter((c): c is TextContent => c.type === 'text');
  const toolCallParts = message.content.filter((c): c is ToolCallContent => c.type === 'tool-call');
  const subAgentParts = message.content.filter((c): c is SubAgentContent => c.type === 'sub-agent');

  // 流式内容优先展示，否则展示 committed 内容
  const displayText = streamingContent !== undefined ? streamingContent : textParts.map((t) => t.text).join('');

  // 流式工具调用：streaming 期间显示 streamingToolCalls，否则显示 committed toolCallParts
  const displayToolCalls: ToolCallRecord[] =
    streamingToolCalls !== undefined
      ? streamingToolCalls
      : toolCallParts.map((tc) => tc.toolCall);

  return (
    <div className={styles.wrapper}>
      {displayToolCalls.map((tc) => (
        <ToolCallBlock key={tc.id} toolCall={tc} />
      ))}

      {subAgentParts.map((sa) => (
        <div key={sa.subAgent.id} className={styles.subAgent}>
          <span className={styles.subAgentIcon}>🤖</span>
          <span className={styles.subAgentTask}>{sa.subAgent.task}</span>
          <span className={`${styles.subAgentStatus} ${styles[sa.subAgent.status]}`}>
            {sa.subAgent.status === 'running' ? '执行中' :
             sa.subAgent.status === 'success' ? '完成' :
             sa.subAgent.status === 'failed' ? '失败' :
             sa.subAgent.status === 'timeout' ? '超时' : '已取消'}
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
        <div className={styles.statusRow}>
          <StatusBadge status="failed" label="生成失败" />
        </div>
      )}

      {streamingContent !== undefined && (
        <span className={styles.cursor} aria-hidden />
      )}
    </div>
  );
}
