import { describe, expect, it } from 'vitest';
import {
  assertCanonicalProductionSupabaseUrl,
  KSPCENTER_SUPABASE_URL
} from './production-supabase-target';

describe('production Supabase target guard', () => {
  it('accepts the canonical KSPCENTER URL', () => {
    expect(assertCanonicalProductionSupabaseUrl(KSPCENTER_SUPABASE_URL)).toBe(KSPCENTER_SUPABASE_URL);
  });

  it('normalizes a trailing slash on the canonical URL', () => {
    expect(assertCanonicalProductionSupabaseUrl(`${KSPCENTER_SUPABASE_URL}/`)).toBe(KSPCENTER_SUPABASE_URL);
  });

  it('rejects the retired KSP OS Supabase project', () => {
    expect(() =>
      assertCanonicalProductionSupabaseUrl('https://tqwnsxjrlomosfblleqy.supabase.co')
    ).toThrow('production_supabase_target_mismatch');
  });

  it('rejects non-Supabase or invalid targets', () => {
    expect(() => assertCanonicalProductionSupabaseUrl('https://example.com')).toThrow(
      'production_supabase_target_mismatch'
    );
    expect(() => assertCanonicalProductionSupabaseUrl('not-a-url')).toThrow(
      'production_supabase_target_invalid'
    );
  });
});
