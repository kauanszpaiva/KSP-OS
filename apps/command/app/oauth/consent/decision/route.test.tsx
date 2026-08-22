import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  approveAuthorization: vi.fn(),
  denyAuthorization: vi.fn(),
  getServerSupabase: vi.fn(),
  readSession: vi.fn()
}));

vi.mock('../../../../lib/supabase', () => ({
  getServerSupabase: mocks.getServerSupabase
}));

vi.mock('../../../../lib/session', () => ({
  readSession: mocks.readSession
}));

import { POST } from './route';

describe('OAuth consent decision route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readSession.mockResolvedValue({
      configured: true,
      context: { internalRoles: ['founder_ceo'] }
    });
    mocks.approveAuthorization.mockResolvedValue({
      data: { redirect_url: 'https://client.example/callback?code=abc' },
      error: null
    });
    mocks.denyAuthorization.mockResolvedValue({
      data: { redirect_url: 'https://client.example/callback?error=access_denied' },
      error: null
    });
    mocks.getServerSupabase.mockResolvedValue({
      auth: {
        oauth: {
          approveAuthorization: mocks.approveAuthorization,
          denyAuthorization: mocks.denyAuthorization
        }
      }
    });
  });

  it('uses 303 after approval so the OAuth callback is followed with GET', async () => {
    const request = new Request('https://appkspdominion.com/oauth/consent/decision', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: 'authorizationId=authorization-1&decision=approve'
    });

    const response = await POST(request);

    expect(mocks.approveAuthorization).toHaveBeenCalledOnce();
    expect(mocks.approveAuthorization).toHaveBeenCalledWith('authorization-1');
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('https://client.example/callback?code=abc');
  });
});
