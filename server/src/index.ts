import { app } from './app.js';
import { skillLoader } from './skills/skill-loader.js';
import { mcpService } from './services/mcp-service.js';
import { runService } from './services/run-service.js';
import { attachmentService } from './services/attachment-service.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT ?? 3000;
let server: import('node:http').Server | null = null;
let shuttingDown = false;

async function bootstrap(): Promise<void> {
  await attachmentService.cleanAllOrphanAttachments();
  await mcpService.initialize();
  await skillLoader.loadSkills();

  server = app.listen(PORT, () => {
    logger.info(`Assistant server running on http://localhost:${PORT}`);
  });
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await runService.stopAllRuns();
  await mcpService.closeAll();
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT').catch((error) => {
    logger.error('Graceful shutdown failed:', error);
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM').catch((error) => {
    logger.error('Graceful shutdown failed:', error);
    process.exit(1);
  });
});

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap server:', error);
  process.exit(1);
});
