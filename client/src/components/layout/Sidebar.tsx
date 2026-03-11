import { useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ConversationListItem } from '@assistant/shared';
import { useConversationStore } from '../../stores/conversation-store';
import { confirmDialog } from '../common/ConfirmDialog';
import { showToast } from '../common/Toast';
import styles from './Sidebar.module.css';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString('zh-CN');
}

interface ConversationItemProps {
  conversation: ConversationListItem;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

function ConversationItem({ conversation, isActive, onSelect, onDelete }: ConversationItemProps) {
  const title = conversation.title || '新对话';
  const timeStr = formatRelativeTime(conversation.updatedAt);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(conversation.id);
  };

  return (
    <div
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      onClick={() => onSelect(conversation.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conversation.id)}
    >
      <div className={styles.itemContent}>
        <span className={styles.itemTitle}>{title}</span>
        <span className={styles.itemTime}>{timeStr}</span>
      </div>
      <button
        className={styles.deleteBtn}
        onClick={handleDelete}
        title="删除会话"
        aria-label="删除会话"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
        </svg>
      </button>
    </div>
  );
}

export function Sidebar() {
  const navigate = useNavigate();
  const params = useParams<{ id: string }>();
  const activeId = params.id ?? null;

  const { conversations, loading, load, create, delete: deleteConv, clearAll } = useConversationStore();

  // 初始加载
  useEffect(() => {
    void load();
  }, [load]);

  // 标签页获得焦点时刷新列表
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [load]);

  const handleCreate = useCallback(async () => {
    try {
      const conv = await create();
      navigate(`/chat/${conv.id}`);
    } catch {
      showToast('创建会话失败', 'error');
    }
  }, [create, navigate]);

  const handleSelect = useCallback(
    (id: string) => {
      navigate(`/chat/${id}`);
    },
    [navigate],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await confirmDialog({
        title: '删除会话',
        message: '确认删除该会话？此操作不可撤销。',
        confirmText: '删除',
        cancelText: '取消',
      });
      if (!confirmed) return;

      try {
        await deleteConv(id);
        if (activeId === id) {
          navigate('/');
        }
        showToast('会话已删除', 'success');
      } catch {
        showToast('删除失败', 'error');
      }
    },
    [deleteConv, activeId, navigate],
  );

  const handleClearAll = useCallback(async () => {
    const confirmed = await confirmDialog({
      title: '清空所有会话',
      message: '确认清空全部会话？所有对话记录将被永久删除，此操作不可撤销。',
      confirmText: '清空',
      cancelText: '取消',
    });
    if (!confirmed) return;

    try {
      await clearAll();
      navigate('/');
      showToast('所有会话已清空', 'success');
    } catch {
      showToast('清空失败', 'error');
    }
  }, [clearAll, navigate]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <button className={styles.newBtn} onClick={handleCreate}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          新建对话
        </button>
      </div>

      <div className={styles.list}>
        {loading && conversations.length === 0 ? (
          <div className={styles.emptyState}>加载中...</div>
        ) : conversations.length === 0 ? (
          <div className={styles.emptyState}>暂无对话</div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              onSelect={handleSelect}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {conversations.length > 0 && (
        <div className={styles.sidebarFooter}>
          <button className={styles.clearBtn} onClick={handleClearAll}>
            清空所有对话
          </button>
        </div>
      )}
    </aside>
  );
}
