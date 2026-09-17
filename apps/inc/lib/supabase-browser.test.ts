import { afterEach, describe, expect, it } from 'vitest';
import { resolveIncSupabaseConfig } from './supabase-routing';

const KSPCENTER_URL = 'https://rmaxqwbjizivkhurvuvx.supabase.co';
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
  it('uses the explicitly configured environment on the public standalone hostname', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = KSPCENTER_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'configured-public-key';

    expect(resolveIncSupabaseConfig('ksp-os-inc.vercel.app')).toEqual({
      url: KSPCENTER_URL,
      anonKey: 'configured-public-key',
    });
  });

  it('does not change the configured project when the host header includes a port', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = KSPCENTER_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'configured-public-key';

    expect(resolveIncSupabaseConfig('KSP-OS-INC.VERCEL.APP:443')).toEqual({
      url: KSPCENTER_URL,
      anonKey: 'configured-public-key',
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

  it('fails closed when the Supabase public environment is incomplete', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(resolveIncSupabaseConfig('ksp-os-inc.vercel.app')).toBeNull();
  });
});
