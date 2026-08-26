import { afterEach, describe, expect, it } from 'vitest';
import { resolveIncSupabaseConfig } from './supabase-routing';

const PROD_URL = 'https://tqwnsxjrlomosfblleqy.supabase.co';
const PROD_KEY = 'sb_publishable_NpvF7WGaA8Iy3xGWFRbZsQ_vvCxsiSs';
const PREVIEW_URL = 'https://qfnriufuahlcwbxgprmy.supabase.co';

const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnonKey;
});

describe('KSP INC Auth routing', () => {
  it('pins the public standalone hostname to production Auth even with stale preview env', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'preview-key';

    expect(resolveIncSupabaseConfig('ksp-os-inc.vercel.app')).toEqual({
      url: PROD_URL,
      anonKey: PROD_KEY,
    });
  });

  it('normalizes a host header with a port before applying the public fail-safe', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'preview-key';

    expect(resolveIncSupabaseConfig('KSP-OS-INC.VERCEL.APP:443')).toEqual({
      url: PROD_URL,
      anonKey: PROD_KEY,
    });
  });

  it('keeps preview hostnames isolated on their injected environment', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PREVIEW_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'preview-key';

    expect(
      resolveIncSupabaseConfig(
        'ksp-os-inc-git-feature-ksp-dominion-group.vercel.app',
      ),
    ).toEqual({
      url: PREVIEW_URL,
      anonKey: 'preview-key',
    });
  });
});
