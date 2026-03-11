import { useCallback, useRef } from 'react';
import { useAttachmentStore } from '../stores/attachment-store';

interface UseAttachmentUploadReturn {
  fileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
}

export function useAttachmentUpload(): UseAttachmentUploadReturn {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addFiles = useAttachmentStore((s) => s.addFiles);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageFiles: File[] = [];

      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    },
    [addFiles],
  );

  return { fileInputRef, openFilePicker, handleDrop, handlePaste };
}
