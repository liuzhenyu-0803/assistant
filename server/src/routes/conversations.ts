import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { conversationService } from '../services/conversation-service.js';

const router: ExpressRouter = Router();

// GET /api/conversations — 获取会话列表
router.get('/', async (_req, res, next) => {
  try {
    const conversations = await conversationService.listConversations();
    res.json({ data: conversations });
  } catch (err) {
    next(err);
  }
});

// POST /api/conversations — 新建会话
router.post('/', async (_req, res, next) => {
  try {
    const conversation = await conversationService.createConversation();
    res.status(201).json({ data: conversation });
  } catch (err) {
    next(err);
  }
});

// GET /api/conversations/:id — 获取会话详情
router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await conversationService.getConversation(req.params.id);
    res.json({ data: conversation });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/conversations/:id — 删除会话
router.delete('/:id', async (req, res, next) => {
  try {
    await conversationService.deleteConversation(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// DELETE /api/conversations — 清空所有会话
router.delete('/', async (_req, res, next) => {
  try {
    await conversationService.clearAllConversations();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export { router as conversationsRouter };
