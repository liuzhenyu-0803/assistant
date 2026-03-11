import { useEffect } from 'react';
import styles from './ImagePreview.module.css';

interface ImagePreviewProps {
  url: string;
  name: string;
  onClose: () => void;
}

export function ImagePreview({ url, name, onClose }: ImagePreviewProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeButton} onClick={onClose} title="关闭">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <img
        src={url}
        alt={name}
        className={styles.image}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
