import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import type { MCPServerConfig, UpdateMCPServersRequest } from '@assistant/shared';
import { mcpService } from '../services/mcp-service.js';
import { AppError } from '../utils/errors.js';

const router: ExpressRouter = Router();

router.get('/servers', async (_req, res, next) => {
  try {
    const servers = await mcpService.getServerConfigsWithStatus();
    res.json({ data: servers });
  } catch (error) {
    next(error);
  }
});

router.put('/servers', async (req, res, next) => {
  try {
    const body = req.body as Partial<UpdateMCPServersRequest>;
    if (!body || !Array.isArray(body.servers)) {
      throw new AppError('INVALID_REQUEST', 'servers must be an array');
    }

    const servers = await mcpService.updateServerConfigs(body.servers as MCPServerConfig[]);
    res.json({ data: servers });
  } catch (error) {
    next(error);
  }
});

router.get('/tools', async (_req, res, next) => {
  try {
    res.json({ data: mcpService.getAllTools() });
  } catch (error) {
    next(error);
  }
});

export { router as mcpRouter };
