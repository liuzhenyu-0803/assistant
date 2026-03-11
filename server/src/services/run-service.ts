import { logger } from '../utils/logger.js';

export type RunStatus = 'running' | 'completed' | 'interrupted' | 'failed';

export interface ActiveRun {
  runId: string;
  conversationId: string;
  messageId: string;
  abortController: AbortController;
  startedAt: string;
}

// 内存 Map 维护活跃 Run
const activeRuns = new Map<string, ActiveRun>();

export const runService = {
  /**
   * 创建并注册 Run
   */
  startRun(conversationId: string, messageId: string): ActiveRun {
    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const run: ActiveRun = {
      runId,
      conversationId,
      messageId,
      abortController: new AbortController(),
      startedAt: new Date().toISOString(),
    };
    activeRuns.set(conversationId, run);
    logger.info(`Run started: ${runId} for conversation ${conversationId}`);
    return run;
  },

  /**
   * 标记 Run 完成并从 Map 移除
   */
  completeRun(runId: string, status: RunStatus): void {
    for (const [conversationId, run] of activeRuns.entries()) {
      if (run.runId === runId) {
        activeRuns.delete(conversationId);
        logger.info(`Run completed: ${runId} with status=${status}`);
        return;
      }
    }
  },

  /**
   * 获取会话的活跃 Run
   */
  getActiveRun(conversationId: string): ActiveRun | undefined {
    return activeRuns.get(conversationId);
  },

  /**
   * 检查是否有活跃 Run
   */
  hasActiveRun(conversationId: string): boolean {
    return activeRuns.has(conversationId);
  },

  /**
   * 通过 AbortController 取消 Run
   */
  stopRun(conversationId: string): boolean {
    const run = activeRuns.get(conversationId);
    if (!run) return false;
    run.abortController.abort();
    logger.info(`Run stopped: ${run.runId} for conversation ${conversationId}`);
    return true;
  },

  /**
   * 终止全部活跃 Run（含 10 秒超时强制）
   */
  async stopAllRuns(): Promise<void> {
    const runIds = [...activeRuns.values()].map((r) => r.runId);
    if (runIds.length === 0) return;

    logger.info(`Stopping all active runs: ${runIds.join(', ')}`);

    // 触发所有 abort
    for (const run of activeRuns.values()) {
      run.abortController.abort();
    }

    // 等待最多 10 秒
    const TIMEOUT_MS = 10_000;
    const deadline = Date.now() + TIMEOUT_MS;

    while (activeRuns.size > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (activeRuns.size > 0) {
      logger.warn(`Force-clearing ${activeRuns.size} runs after timeout`);
      activeRuns.clear();
    }
  },
};
