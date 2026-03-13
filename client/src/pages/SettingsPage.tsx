import { useEffect, useRef } from 'react';
import { ModelSettings } from '../components/settings/ModelSettings';
import { SubAgentSettings } from '../components/settings/SubAgentSettings';
import { MCPSettings } from '../components/settings/MCPSettings';
import styles from './SettingsPage.module.css';

interface SettingsPageProps {
  onClose: () => void;
}

export function SettingsPage({ onClose }: SettingsPageProps) {
  const modelSettingsRef = useRef<{ saveCurrentSelection: () => Promise<void>; reloadProviders: () => Promise<void> }>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  async function handleClose() {
    // 关闭时保存当前选择
    if (modelSettingsRef.current?.saveCurrentSelection) {
      await modelSettingsRef.current.saveCurrentSelection();
    }
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="系统配置">
        <div className={styles.modalHeader}>
          <h1 className={styles.modalTitle}>系统配置</h1>
          <button type="button" className={styles.closeButton} onClick={handleClose} aria-label="关闭系统配置">
            ×
          </button>
        </div>
        <div className={styles.content}>
          <ModelSettings ref={modelSettingsRef} />
          <hr className={styles.divider} />
          <MCPSettings />
          <hr className={styles.divider} />
          <SubAgentSettings />
        </div>
      </div>
    </div>
  );
}
