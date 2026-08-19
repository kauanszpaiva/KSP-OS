import { logger } from './logger';

export interface PerformanceBudget {
  targetMs: number;
  criticalMs: number;
}

const DEFAULT_BUDGETS: Record<string, PerformanceBudget> = {
  'api.read': { targetMs: 100, criticalMs: 500 },
  'api.write': { targetMs: 200, criticalMs: 1000 },
  'page.load': { targetMs: 1000, criticalMs: 3000 },
};

export const metrics = {
  recordLatency: (operation: string, durationMs: number, meta?: Record<string, unknown>) => {
    const budget = DEFAULT_BUDGETS[operation] || { targetMs: 500, criticalMs: 2000 };

    const isExceeded = durationMs > budget.targetMs;
    const isCritical = durationMs > budget.criticalMs;

    const level = isCritical ? 'error' : isExceeded ? 'warn' : 'info';

    logger.log(level, `Performance metric: ${operation}`, {
      metric: 'latency',
      operation,
      durationMs,
      budget: budget.targetMs,
      status: isCritical ? 'critical' : isExceeded ? 'degraded' : 'ok',
      ...meta
    });
  },

  async measure<T>(operation: string, fn: () => Promise<T>, meta?: Record<string, unknown>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      metrics.recordLatency(operation, Date.now() - start, { success: true, ...meta });
      return result;
    } catch (error) {
      metrics.recordLatency(operation, Date.now() - start, { success: false, ...meta });
      throw error;
    }
  }
};
