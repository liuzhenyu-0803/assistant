import { create } from 'zustand';
import styles from './ConfirmDialog.module.css';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmDialogState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  resolve: ((value: boolean) => void) | null;
  open: (options: ConfirmDialogOptions) => Promise<boolean>;
  close: (result: boolean) => void;
}

const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  isOpen: false,
  options: null,
  resolve: null,
  open: (options) => {
    return new Promise<boolean>((resolve) => {
      set({ isOpen: true, options, resolve });
    });
  },
  close: (result) => {
    const { resolve } = get();
    if (resolve) {
      resolve(result);
    }
    set({ isOpen: false, options: null, resolve: null });
  },
}));

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return useConfirmDialogStore.getState().open(options);
}

export function ConfirmDialogContainer() {
  const { isOpen, options, close } = useConfirmDialogStore();

  if (!isOpen || !options) return null;

  const confirmText = options.confirmText ?? 'Confirm';
  const cancelText = options.cancelText ?? 'Cancel';

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className={styles.dialog}>
        <h2 id="confirm-title" className={styles.title}>
          {options.title}
        </h2>
        <p className={styles.message}>{options.message}</p>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={() => close(false)}>
            {cancelText}
          </button>
          <button className={styles.confirmButton} onClick={() => close(true)}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
