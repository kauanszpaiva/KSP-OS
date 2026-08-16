import { describe, expect, it } from 'vitest';
import { getSessionAal } from './context';
import type { SupabaseClient } from '@ksp/database';

/**
 * Regression coverage for the 2026-08-16 audit finding: session MFA state
 * must reflect the real Authenticator Assurance Level, not a hardcoded
 * `true`. A session that has not completed step-up must never be treated as
 * MFA-satisfied.
 */
function fakeClient(currentLevel: 'aal1' | 'aal2' | null, error: unknown = null): SupabaseClient {
  return {
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: async () =>
          error
            ? { data: null, error }
            : { data: { currentLevel, nextLevel: currentLevel }, error: null }
      }
    }
  } as unknown as SupabaseClient;
}

describe('getSessionAal', () => {
  it('returns true only when the session currentLevel is aal2', async () => {
    expect(await getSessionAal(fakeClient('aal2'))).toBe(true);
  });

  it('returns false for an aal1 session, even if step-up is available', async () => {
    expect(await getSessionAal(fakeClient('aal1'))).toBe(false);
  });

  it('fails closed when the assurance level cannot be determined', async () => {
    expect(await getSessionAal(fakeClient(null, new Error('unavailable')))).toBe(false);
    expect(await getSessionAal(fakeClient(null))).toBe(false);
  });
});
