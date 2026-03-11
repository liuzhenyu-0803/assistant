import type { UploadAttachmentResponse } from '@assistant/shared';

const BASE_URL = '/api';

export async function uploadAttachment(
  conversationId: string,
  file: File,
): Promise<UploadAttachmentResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/conversations/${conversationId}/attachments`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    let message = `上传失败 (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (json.error?.message) message = json.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const json = await response.json();
  return (json as { data: UploadAttachmentResponse }).data;
}

export async function deleteAttachment(
  conversationId: string,
  attachmentId: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/conversations/${conversationId}/attachments/${attachmentId}`,
    { method: 'DELETE' },
  );

  if (!response.ok) {
    const text = await response.text();
    let message = `删除失败 (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (json.error?.message) message = json.error.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}

export function getAttachmentUrl(conversationId: string, filename: string): string {
  return `${BASE_URL}/attachments/${conversationId}/${filename}`;
}
