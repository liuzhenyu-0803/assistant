import styles from './Header.module.css';

interface HeaderProps {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.title}>Assistant</div>
      <nav className={styles.nav}>
        <button
          type="button"
          className={styles.settingsButton}
          title="系统配置"
          aria-label="打开系统配置"
          onClick={onOpenSettings}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93A10 10 0 0 0 4.93 19.07M19.07 4.93l-1.41 1.41M4.93 19.07l1.41-1.41" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
          </svg>
        </button>
      </nav>
    </header>
  );
}
