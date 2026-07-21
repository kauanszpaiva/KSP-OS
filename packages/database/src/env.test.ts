import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSupabaseConfigured, readPublicEnv, readServiceRoleKey } from './env';

const originalEnv = process.env;

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = originalEnv;
});

function withEnv(values: NodeJS.ProcessEnv) {
  process.env = { ...originalEnv, ...values };
}

describe('Supabase environment', () => {
  it('reads the configured public Supabase backend without exposing server credentials', () => {
    withEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://tqwnsxjrlomosfblleqy.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'publishable-test-key',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
      SUPABASE_SERVER_ONLY_SECRET_KEY: 'secret-test-key',
      SUPABASE_SERVER_ONLY_SERVICE_KEY: 'server-only-test-key'
    });

    expect(readPublicEnv()).toEqual({
      url: 'https://tqwnsxjrlomosfblleqy.supabase.co',
      anonKey: 'publishable-test-key'
    });
    expect(isSupabaseConfigured()).toBe(true);
  });


  it('keeps legacy anon and service-role variable names as a fallback', () => {
    withEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'https://tqwnsxjrlomosfblleqy.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
      SUPABASE_SERVER_ONLY_SERVICE_KEY: 'server-only-test-key'
    });

    expect(readPublicEnv()).toEqual({
      url: 'https://tqwnsxjrlomosfblleqy.supabase.co',
      anonKey: 'anon-test-key'
    });
  });

  it('treats missing or malformed public settings as unconfigured', () => {
    withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key' });
    expect(readPublicEnv()).toBeNull();

    withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'not-a-url', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key' });
    expect(readPublicEnv()).toBeNull();

    withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://tqwnsxjrlomosfblleqy.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' });
    expect(readPublicEnv()).toBeNull();
  });

  it('reads the preferred privileged key name on the server', () => {
    withEnv({ SUPABASE_SERVER_ONLY_SECRET_KEY: 'secret-test-key', SUPABASE_SERVER_ONLY_SERVICE_KEY: 'server-only-test-key' });
    vi.stubGlobal('window', undefined);

    expect(readServiceRoleKey()).toBe('secret-test-key');
  });

  it('reads the legacy privileged key name on the server as a fallback', () => {
    withEnv({ SUPABASE_SERVER_ONLY_SERVICE_KEY: 'server-only-test-key' });
    vi.stubGlobal('window', undefined);

    expect(readServiceRoleKey()).toBe('server-only-test-key');
  });

  it('refuses to read service-role credentials in the browser', () => {
    withEnv({ SUPABASE_SERVER_ONLY_SECRET_KEY: 'secret-test-key' });
    vi.stubGlobal('window', {});

    expect(() => readServiceRoleKey()).toThrow('supabase_privileged_key_must_not_be_read_in_browser');
  });
});
