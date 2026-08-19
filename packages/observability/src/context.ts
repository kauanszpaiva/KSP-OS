// Try to import AsyncLocalStorage from async_hooks, but fail gracefully
// if it's not available (e.g. in browser or edge runtime if not supported)

export interface TracingContext {
  requestId: string;
}

// Global fallback if AsyncLocalStorage isn't available
let _store: TracingContext | undefined;

export const tracingContext = {
  getStore: (): TracingContext | undefined => {
    try {
      // Use dynamic require/import to avoid breaking webpack bundling
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asyncHooks = require('async_hooks');
      if (asyncHooks.AsyncLocalStorage && !globalThis.__tracingContextCache) {
        globalThis.__tracingContextCache = new asyncHooks.AsyncLocalStorage();
      }
      return globalThis.__tracingContextCache?.getStore() || _store;
    } catch {
      return _store;
    }
  },
  run: <T>(store: TracingContext, callback: () => T): T => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const asyncHooks = require('async_hooks');
      if (asyncHooks.AsyncLocalStorage && !globalThis.__tracingContextCache) {
        globalThis.__tracingContextCache = new asyncHooks.AsyncLocalStorage();
      }
      if (globalThis.__tracingContextCache) {
         return globalThis.__tracingContextCache.run(store, callback);
      }
    } catch {
      // fallback
    }

    _store = store;
    try {
      return callback();
    } finally {
      _store = undefined;
    }
  }
};

declare global {
  // eslint-disable-next-line no-var
  var __tracingContextCache: any;
}

export function getRequestId(): string {
  const store = tracingContext.getStore();
  return store?.requestId || crypto.randomUUID();
}
