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
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key',
      SUPABASE_SERVER_ONLY_SERVICE_KEY: 'server-only-test-key'
    });

    expect(readPublicEnv()).toEqual({
      url: 'https://tqwnsxjrlomosfblleqy.supabase.co',
      anonKey: 'anon-test-key'
    });
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('treats missing or malformed public settings as unconfigured', () => {
    withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://example.com', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key' });
    expect(readPublicEnv()).toBeNull();

    withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'not-a-url', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-test-key' });
    expect(readPublicEnv()).toBeNull();

    withEnv({ NEXT_PUBLIC_SUPABASE_URL: 'https://tqwnsxjrlomosfblleqy.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: '' });
    expect(readPublicEnv()).toBeNull();
  });

  it('refuses to read service-role credentials in the browser', () => {
    withEnv({ SUPABASE_SERVER_ONLY_SERVICE_KEY: 'server-only-test-key' });
    vi.stubGlobal('window', {});

    expect(() => readServiceRoleKey()).toThrow('service_role_key_must_not_be_read_in_browser');
  });
});
