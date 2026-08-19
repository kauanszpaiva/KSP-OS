import { getRequestId } from './context';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  [key: string]: unknown;
}

function redact(data: unknown, seen = new WeakSet()): unknown {
  if (data === null || data === undefined) return data;

  if (typeof data === 'object') {
    if (seen.has(data as object)) {
      return '[CIRCULAR]';
    }
    seen.add(data as object);

    if (Array.isArray(data)) {
      return data.map(item => redact(item, seen));
    }

    const redacted = { ...data } as Record<string, unknown>;

    // Explicit exact match or specific patterns to avoid redacting legitimate tracking properties like "url" or "apiKey"
    const sensitiveExactKeys = ['password', 'secret', 'token', 'authorization', 'cookie'];
    const sensitiveIncludesPatterns = ['api_key', 'apikey', 'secret_key', 'secretkey', 'access_token'];

    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();
      const isSensitive =
        sensitiveExactKeys.includes(lowerKey) ||
        sensitiveIncludesPatterns.some(pattern => lowerKey.includes(pattern));

      if (isSensitive) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redact(redacted[key], seen);
      }
    }
    return redacted;
  }

  return data;
}

export const logger = {
  log: (level: LogLevel, message: string, meta?: Record<string, unknown>) => {
    const requestId = getRequestId();

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId,
      ...(meta ? (redact(meta) as Record<string, unknown>) : {})
    };

    // eslint-disable-next-line
    // @ts-ignore
    process.stdout.write(JSON.stringify(entry) + '\n');
  },

  debug: (message: string, meta?: Record<string, unknown>) => logger.log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.log('warn', message, meta),
  error: (message: string, error?: Error | unknown, meta?: Record<string, unknown>) => {
    const errorMeta = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : { error };

    logger.log('error', message, { ...errorMeta, ...meta });
  }
};
