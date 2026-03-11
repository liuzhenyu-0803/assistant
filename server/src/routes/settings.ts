import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import type { Settings } from '@assistant/shared';
import { settingsService } from '../services/settings-service.js';
import { AppError } from '../utils/errors.js';

const router: ExpressRouter = Router();

// GET /api/settings
router.get('/', async (_req, res, next) => {
  try {
    const settings = await settingsService.getMaskedSettings();
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<Settings>;

    if (!body.baseURL || !body.apiKey || !body.model) {
      throw new AppError('INVALID_REQUEST', 'baseURL, apiKey, and model are required');
    }

    const settings: Settings = {
      baseURL: body.baseURL,
      apiKey: body.apiKey,
      model: body.model,
      contextWindowSize: body.contextWindowSize ?? 128000,
    };

    await settingsService.updateSettings(settings);
    const masked = await settingsService.getMaskedSettings();
    res.json({ data: masked });
  } catch (err) {
    next(err);
  }
});

export { router as settingsRouter };
