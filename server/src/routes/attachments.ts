import path from 'node:path';
import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import multer from 'multer';
import { attachmentService } from '../services/attachment-service.js';
import { AppError } from '../utils/errors.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

const router: ExpressRouter = Router({ mergeParams: true });

// POST /api/conversations/:id/attachments — 上传附件
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('INVALID_REQUEST', 'No file provided');
    }

    const conversationId = req.params['id'] as string;
    const ref = await attachmentService.uploadAttachment(conversationId, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer,
    });

    res.status(201).json({ data: ref });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/conversations/:id/attachments/:attachmentId — 删除暂存附件
router.delete('/:attachmentId', async (req, res, next) => {
  try {
    const params = req.params as { id: string; attachmentId: string };
    const conversationId = params.id;
    const attachmentId = params.attachmentId;
    await attachmentService.deleteAttachment(conversationId, attachmentId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// multer 413 错误处理
router.use((err: unknown, _req: unknown, res: unknown, next: unknown) => {
  const response = res as import('express').Response;
  const nextFn = next as import('express').NextFunction;

  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({
      error: {
        code: 'INVALID_REQUEST',
        message: 'File too large (max 100MB)',
      },
    });
    return;
  }
  nextFn(err);
});

export { router as attachmentsRouter };

// 独立路由：GET /api/attachments/:conversationId/:filename — 获取附件文件
const staticRouter: ExpressRouter = Router();

staticRouter.get('/:conversationId/:filename', (req, res, next) => {
  try {
    const { conversationId, filename } = req.params;
    const filePath = attachmentService.getAttachmentPath(conversationId, filename);
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
    };
    const contentType = mimeTypes[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath, (err) => {
      if (err) next(err);
    });
  } catch (err) {
    next(err);
  }
});

export { staticRouter as attachmentStaticRouter };
