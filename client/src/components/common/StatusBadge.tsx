import styles from './StatusBadge.module.css';

export type StatusType =
  | 'running'
  | 'success'
  | 'failed'
  | 'interrupted'
  | 'cancelled'
  | 'timeout';

const STATUS_LABELS: Record<StatusType, string> = {
  running: 'Running',
  success: 'Success',
  failed: 'Failed',
  interrupted: 'Interrupted',
  cancelled: 'Cancelled',
  timeout: 'Timeout',
};

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const displayLabel = label ?? STATUS_LABELS[status];

  return (
    <span className={`${styles.badge} ${styles[status]}`} title={displayLabel}>
      {displayLabel}
    </span>
  );
}
