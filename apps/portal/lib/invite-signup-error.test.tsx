import { describe, expect, it } from 'vitest';
import { describeInviteSignupError } from './invite-signup-error';

describe('invitation error mapping', () => {
  it.each([404, 503])('handles a non-JSON proxy response with status %s', async (status) => {
    const context = new Response('<html>proxy error</html>', { status });
    expect(await describeInviteSignupError(null, { context })).toMatch(/temporarily unavailable/);
    expect(context.bodyUsed).toBe(false);
  });
  it('explains rate limiting', async () => {
    expect(await describeInviteSignupError(null, { context: new Response('', { status: 429 }) })).toMatch(/Too many attempts/);
  });
  it('explains signup field requirements without exposing provider detail', async () => {
    expect(await describeInviteSignupError({ error: 'invalid_request', message: 'private detail' }, null)).toMatch(/8 to 128/);
    expect(await describeInviteSignupError({ error: 'invalid_request', message: 'private detail' }, null)).not.toMatch(/private detail/);
  });
  it('handles unavailable confirmation delivery', async () => {
    expect(await describeInviteSignupError({ error: 'confirmation_email_unavailable' }, null)).toMatch(/temporarily unavailable/);
  });
  it('does not confirm account existence on conflicts', async () => {
    expect(await describeInviteSignupError(null, { context: new Response('', { status: 409 }) })).toMatch(/If you already registered/);
  });
  it('handles empty or unexpected provider values safely', async () => {
    expect(await describeInviteSignupError(null, null)).toMatch(/could not complete/);
    expect(await describeInviteSignupError({ error: 'private-token', message: 'private-detail' }, {})).not.toMatch(/private-/);
  });
});
