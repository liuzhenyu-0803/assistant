import { useState } from 'react';
import type { ToolCallRecord } from '@assistant/shared';
import styles from './ToolCallBlock.module.css';

interface ToolCallBlockProps {
  toolCall: ToolCallRecord;
}

const STATUS_LABEL: Record<string, string> = {
  running: '执行中',
  success: '完成',
  failed: '失败',
  cancelled: '已取消',
};

export function ToolCallBlock({ toolCall }: ToolCallBlockProps) {
  const [argsExpanded, setArgsExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);

  const hasArgs = Object.keys(toolCall.arguments).length > 0;
  const hasResult = toolCall.result !== undefined;
  const hasError = toolCall.error !== undefined;

  return (
    <div className={`${styles.block} ${styles[toolCall.status]}`}>
      <div className={styles.header}>
        <span className={styles.icon}>
          {toolCall.status === 'running' ? '⟳' :
           toolCall.status === 'success' ? '✓' :
           toolCall.status === 'failed' ? '✕' : '○'}
        </span>
        <span className={styles.name}>{toolCall.toolName}</span>
        <span className={`${styles.statusBadge} ${styles[`badge_${toolCall.status}`]}`}>
          {STATUS_LABEL[toolCall.status] ?? toolCall.status}
        </span>
      </div>

      {hasArgs && (
        <div className={styles.section}>
          <button
            className={styles.toggleBtn}
            onClick={() => setArgsExpanded((v) => !v)}
            type="button"
          >
            {argsExpanded ? '▾' : '▸'} 参数
          </button>
          {argsExpanded && (
            <pre className={styles.code}>{JSON.stringify(toolCall.arguments, null, 2)}</pre>
          )}
        </div>
      )}

      {hasResult && (
        <div className={styles.section}>
          <button
            className={styles.toggleBtn}
            onClick={() => setResultExpanded((v) => !v)}
            type="button"
          >
            {resultExpanded ? '▾' : '▸'} 结果
          </button>
          {resultExpanded && (
            <pre className={styles.code}>{toolCall.result}</pre>
          )}
        </div>
      )}

      {hasError && (
        <div className={styles.errorText}>{toolCall.error}</div>
      )}
    </div>
  );
}
