export interface AttachmentRef {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: AttachmentStatus;
  createdAt: string;
}

export type AttachmentStatus = 'staged' | 'attached' | 'copying' | 'unavailable';
