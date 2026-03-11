import { useRef, useState } from 'react';
import { TextArea, type TextAreaHandle } from './TextArea';
import { AttachmentPreview } from './AttachmentPreview';
import { useAttachmentStore } from '../../stores/attachment-store';
import { useAttachmentUpload } from '../../hooks/useAttachmentUpload';
import styles from './ChatInput.module.css';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function ChatInput({ value, onChange, onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const textAreaRef = useRef<TextAreaHandle>(null);
  const pendingAttachments = useAttachmentStore((s) => s.pendingAttachments);
  const removeAttachment = useAttachmentStore((s) => s.removeAttachment);
  const addFiles = useAttachmentStore((s) => s.addFiles);

  const { fileInputRef, openFilePicker, handleDrop, handlePaste } = useAttachmentUpload();

  const [isDragOver, setIsDragOver] = useState(false);

  function handleSend() {
    if ((!value.trim() && pendingAttachments.length === 0) || isStreaming || disabled) return;
    onSend();
    setTimeout(() => textAreaRef.current?.focus(), 0);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleDropWrapper(e: React.DragEvent) {
    setIsDragOver(false);
    handleDrop(e);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addFiles(files);
    e.target.value = '';
  }

  const canSend = (value.trim().length > 0 || pendingAttachments.length > 0) && !isStreaming && !disabled;

  return (
    <div
      className={`${styles.container} ${isDragOver ? styles.dragOver : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropWrapper}
    >
      <AttachmentPreview attachments={pendingAttachments} onRemove={removeAttachment} />
      <div className={styles.inputRow}>
        <button
          className={`${styles.button} ${styles.attachButton}`}
          onClick={openFilePicker}
          disabled={isStreaming || disabled}
          title="添加附件"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M13 7.5L7.5 13A3.5 3.5 0 012 7.5L7.5 2a2.5 2.5 0 013.5 3.5L5.5 11A1.5 1.5 0 013.5 9L8 4.5" />
          </svg>
        </button>
        <TextArea
          ref={textAreaRef}
          value={value}
          onChange={onChange}
          onSubmit={handleSend}
          onPaste={handlePaste}
          placeholder="输入消息，Enter 发送，Shift+Enter 换行"
          disabled={isStreaming || disabled}
        />
        {isStreaming ? (
          <button className={`${styles.button} ${styles.stopButton}`} onClick={onStop} title="停止生成">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="10" height="10" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            className={`${styles.button} ${styles.sendButton}`}
            onClick={handleSend}
            disabled={!canSend}
            title="发送"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2l12 6-12 6V9.5l8-1.5-8-1.5V2z" />
            </svg>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef as React.RefObject<HTMLInputElement>}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </div>
  );
}

