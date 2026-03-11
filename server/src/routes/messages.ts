import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import type { SendMessageRequest } from '@assistant/shared';
import { createMessageId } from '@assistant/shared';
import { conversationService } from '../services/conversation-service.js';
import { runService } from '../services/run-service.js';
import { settingsService } from '../services/settings-service.js';
import { runMainAgent } from '../agent/main-agent.js';
import { setupSSEResponse, sendSSEEvent, startPingInterval } from '../utils/sse.js';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router: ExpressRouter = Router({ mergeParams: true });

// POST /api/conversations/:id/messages — 发送消息，启动 Run，返回 SSE 流
router.post('/', async (req, res, next) => {
  const { id: conversationId } = req.params as { id: string };

  try {
    // 校验配置完整性
    const settings = await settingsService.getSettings();
    const configError = settingsService.validateSettings(settings);
    if (configError) {
      throw new AppError('CONFIG_INCOMPLETE', configError);
    }

    // 校验请求体
    const body = req.body as SendMessageRequest;
    if (!body || !Array.isArray(body.content) || body.content.length === 0) {
      throw new AppError('INVALID_REQUEST', '消息内容不能为空');
    }
    if (typeof body.revision !== 'number') {
      throw new AppError('INVALID_REQUEST', 'revision 字段必须为数字');
    }

    // 检查会话是否存在
    await conversationService.getConversation(conversationId);

    // 检查是否已有活动 Run
    if (runService.hasActiveRun(conversationId)) {
      throw new AppError('RUN_ACTIVE', '该会话已有正在运行的对话，请等待完成或停止后重试');
    }

    // 持久化用户消息（含 revision 冲突检测）
    const userMessage = await conversationService.addUserMessage(
      conversationId,
      body.content,
      body.revision,
    );

    // 启动 Run
    const messageId = createMessageId();
    const run = runService.startRun(conversationId, messageId);

    // 切换为 SSE 模式
    setupSSEResponse(res);
    const stopPing = startPingInterval(res);

    // 监听客户端断开
    req.on('close', () => {
      if (runService.hasActiveRun(conversationId)) {
        logger.info(`Client disconnected, stopping run ${run.runId}`);
        runService.stopRun(conversationId);
      }
    });

    // 发送 run-start 事件
    sendSSEEvent(res, 'run-start', { runId: run.runId, messageId: userMessage.id });

    // 获取最新会话（含新加入的用户消息）
    const conversation = await conversationService.getConversation(conversationId);

    const assistantMessageId = createMessageId();
    const assistantCreatedAt = new Date().toISOString();
    let finalStatus: 'completed' | 'interrupted' = 'completed';
    let assistantContent: import('@assistant/shared').MessageContent[] = [];

    try {
      assistantContent = await runMainAgent(conversation, run.runId, res, run.abortController.signal);
      finalStatus = run.abortController.signal.aborted ? 'interrupted' : 'completed';
    } catch (agentError) {
      stopPing();
      const errorMessage = agentError instanceof Error ? agentError.message : '未知错误';

      // 如果是配置不完整错误
      if (agentError instanceof AppError && agentError.code === 'CONFIG_INCOMPLETE') {
        sendSSEEvent(res, 'error', {
          runId: run.runId,
          code: 'CONFIG_INCOMPLETE',
          message: errorMessage,
          revision: conversation.revision + 1,
        });
      } else {
        sendSSEEvent(res, 'error', {
          runId: run.runId,
          code: 'INTERNAL_ERROR',
          message: errorMessage,
          revision: conversation.revision + 1,
        });
      }

      runService.completeRun(run.runId, 'failed');

      // 持久化失败的助手消息（若有部分内容）
      if (assistantContent.length > 0) {
        try {
          await conversationService.addAssistantMessage(conversationId, {
            id: assistantMessageId,
            role: 'assistant',
            content: assistantContent,
            status: 'failed',
            runId: run.runId,
            createdAt: assistantCreatedAt,
          });
        } catch (saveErr) {
          logger.error('Failed to save failed assistant message:', saveErr);
        }
      }

      res.end();
      return;
    }

    stopPing();
    runService.completeRun(run.runId, finalStatus);

    // 获取当前会话 revision（用于 done 事件）
    const latestConversation = await conversationService.getConversation(conversationId);

    // 持久化助手消息
    let savedRevision = latestConversation.revision;
    if (assistantContent.length > 0) {
      try {
        await conversationService.addAssistantMessage(conversationId, {
          id: assistantMessageId,
          role: 'assistant',
          content: assistantContent,
          status: finalStatus,
          runId: run.runId,
          createdAt: assistantCreatedAt,
        });
        // 再次获取 revision
        const afterSave = await conversationService.getConversation(conversationId);
        savedRevision = afterSave.revision;
      } catch (saveErr) {
        logger.error('Failed to save assistant message:', saveErr);
      }
    }

    sendSSEEvent(res, 'done', {
      runId: run.runId,
      status: finalStatus,
      revision: savedRevision,
    });

    res.end();
  } catch (err) {
    if (res.headersSent) {
      // SSE 已开始，无法使用标准错误处理
      logger.error('Error after SSE started:', err);
      res.end();
    } else {
      next(err);
    }
  }
});

// POST /api/conversations/:id/stop — 停止当前 Run
router.post('/stop', async (req, res, next) => {
  const { id: conversationId } = req.params as { id: string };

  try {
    const stopped = runService.stopRun(conversationId);
    res.json({ data: { stopped } });
  } catch (err) {
    next(err);
  }
});

export { router as messagesRouter };
