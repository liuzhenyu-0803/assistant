import { ModelSettings } from '../components/settings/ModelSettings';
import { MCPSettings } from '../components/settings/MCPSettings';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <ModelSettings />
        <hr className={styles.divider} />
        <MCPSettings />
      </div>
    </div>
  );
}
