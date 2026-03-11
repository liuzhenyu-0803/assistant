import { forwardRef, useRef, useImperativeHandle, type KeyboardEvent, type ClipboardEvent } from 'react';
import styles from './TextArea.module.css';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPaste?: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}

export interface TextAreaHandle {
  focus: () => void;
}

export const TextArea = forwardRef<TextAreaHandle, TextAreaProps>(function TextArea(
  { value, onChange, onSubmit, onPaste, placeholder, disabled },
  ref,
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus() {
      textareaRef.current?.focus();
    },
  }));

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) {
        onSubmit();
      }
    }
  }

  return (
    <textarea
      ref={textareaRef}
      className={styles.textarea}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onPaste={onPaste}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
    />
  );
});
