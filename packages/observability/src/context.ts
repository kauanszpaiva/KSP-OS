import { AsyncLocalStorage } from 'node:async_hooks';

export interface TracingContext {
  requestId: string;
}

export const tracingContext = new AsyncLocalStorage<TracingContext>();

export function getRequestId(): string {
  const store = tracingContext.getStore();
  return store?.requestId || crypto.randomUUID();
}
