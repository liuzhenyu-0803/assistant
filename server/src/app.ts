import fs from 'node:fs';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';
import { conversationsRouter } from './routes/conversations.js';
import { settingsRouter } from './routes/settings.js';
import { attachmentsRouter, attachmentStaticRouter } from './routes/attachments.js';
import { messagesRouter } from './routes/messages.js';
import { mcpRouter } from './routes/mcp.js';
import { skillsRouter } from './routes/skills.js';
import { CONVERSATIONS_DIR, DATA_DIR, SKILLS_DIR } from './storage/paths.js';
import { AppError } from './utils/errors.js';
import { logger } from './utils/logger.js';

function ensureDataDirectories(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(CONVERSATIONS_DIR, { recursive: true });
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
}

export function createApp(): Express {
  ensureDataDirectories();

  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/settings', settingsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/conversations/:id/attachments', attachmentsRouter);
  app.use('/api/conversations/:id/messages', messagesRouter);
  app.use('/api/attachments', attachmentStaticRouter);
  app.use('/api/mcp', mcpRouter);
  app.use('/api/skills', skillsRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json(err.toJSON());
      return;
    }

    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  return app;
}

export const app: Express = createApp();
