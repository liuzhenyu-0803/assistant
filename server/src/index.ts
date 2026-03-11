import { app } from './app.js';
import { skillLoader } from './skills/skill-loader.js';
import { mcpService } from './services/mcp-service.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT ?? 3000;

async function bootstrap(): Promise<void> {
  await mcpService.initialize();
  await skillLoader.loadSkills();

  app.listen(PORT, () => {
    logger.info(`Assistant server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap server:', error);
  process.exit(1);
});
