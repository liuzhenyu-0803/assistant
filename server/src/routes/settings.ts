import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import type {
  Settings,
  ModelProvider,
  UpdateSubAgentConfigTextRequest,
} from '@assistant/shared';
import { settingsService } from '../services/settings-service.js';
import { subAgentService } from '../services/sub-agent-service.js';
import { AppError } from '../utils/errors.js';

const router: ExpressRouter = Router();

// GET /api/settings
router.get('/', async (_req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({ data: settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', async (req, res, next) => {
  try {
    const body = req.body as Partial<Settings>;

    // 读取当前 settings，保留原有数据结构
    const currentSettings = await settingsService.getSettings();

    const settings: Settings = {
      modelProviders: currentSettings.modelProviders, // 始终从 model-providers.json 读取，不接受客户端传来的 providers
      modelConfigs: Array.isArray(body.modelConfigs) ? body.modelConfigs : [],
      activeModelConfigId: typeof body.activeModelConfigId === 'string' ? body.activeModelConfigId : '',
    };

    const validationError = settingsService.validateSettings(settings);
    if (validationError) {
      throw new AppError('INVALID_REQUEST', validationError);
    }

    await settingsService.updateSettings(settings);
    const savedSettings = await settingsService.getSettings();
    res.json({ data: savedSettings });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/model-providers
router.get('/model-providers', async (_req, res, next) => {
  try {
    const providers = await settingsService.getModelProviders();
    res.json({ data: providers });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/model-providers
router.put('/model-providers', async (req, res, next) => {
  try {
    const providers = req.body as ModelProvider[];

    if (!Array.isArray(providers)) {
      throw new AppError('INVALID_REQUEST', 'Provider 配置必须是数组');
    }

    // 验证每个 Provider
    for (const provider of providers) {
      if (!provider.name) {
        throw new AppError('INVALID_REQUEST', 'Provider 名称不能为空');
      }
      if (!provider.baseURL) {
        throw new AppError('INVALID_REQUEST', 'Base URL 不能为空');
      }
      if (!Array.isArray(provider.models) || provider.models.length === 0) {
        throw new AppError('INVALID_REQUEST', '至少需要一个模型');
      }
    }

    await settingsService.saveModelProviders(providers);
    const updatedProviders = await settingsService.getModelProviders();
    res.json({ data: updatedProviders });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/sub-agents
router.get('/sub-agents', async (_req, res, next) => {
  try {
    const content = await subAgentService.getConfigText();
    res.json({ data: { content } });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings/sub-agents
router.put('/sub-agents', async (req, res, next) => {
  try {
    const body = req.body as Partial<UpdateSubAgentConfigTextRequest>;
    if (!body || typeof body.content !== 'string') {
      throw new AppError('INVALID_REQUEST', 'content must be a string');
    }

    const content = await subAgentService.updateConfigText(body.content);
    res.json({ data: { content } });
  } catch (err) {
    next(err);
  }
});

export { router as settingsRouter };
