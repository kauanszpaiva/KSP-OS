import { describe, expect, it, vi } from 'vitest';
import { buildJulesTaskPrompt, createJulesClient, mapJulesState } from './jules';

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

describe('Google Jules client', () => {
  it('discovers the repository source and creates a plan-gated PR session', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({
        sources: [{
          name: 'sources/123',
          githubRepo: { owner: 'kauanszpaiva', repo: 'KSP-OS', defaultBranch: 'main' }
        }]
      }))
      .mockResolvedValueOnce(response({
        name: 'sessions/456',
        state: 'PLANNING',
        url: 'https://jules.google.com/session/456'
      }));

    const client = createJulesClient({ apiKey: 'test-key', fetchImpl: fetchMock });
    const session = await client.createRepositorySession({
      owner: 'kauanszpaiva',
      repo: 'KSP-OS',
      title: 'Improve project cards',
      prompt: 'Make project cards easier to scan.'
    });

    expect(session.name).toBe('sessions/456');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ 'x-goog-api-key': 'test-key' });
    const createInit = fetchMock.mock.calls[1]?.[1];
    const createBody = JSON.parse(String(createInit?.body));
    expect(createBody.sourceContext).toEqual({
      source: 'sources/123',
      githubRepoContext: { startingBranch: 'main' }
    });
    expect(createBody.requirePlanApproval).toBe(true);
    expect(createBody.automationMode).toBe('AUTO_CREATE_PR');
  });

  it('never includes a rejected credential in provider errors', async () => {
    const secret = 'do-not-leak-this-key';
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response({ error: { message: secret } }, 403));
    const client = createJulesClient({ apiKey: secret, fetchImpl: fetchMock });

    await expect(client.findGithubSource('kauanszpaiva', 'KSP-OS')).rejects.toThrow('rejected the configured API credential');
    await expect(client.findGithubSource('kauanszpaiva', 'KSP-OS')).rejects.not.toThrow(secret);
  });

  it('builds a bounded task prompt with repository safety rules', () => {
    const prompt = buildJulesTaskPrompt({ title: 'Fix mobile layout', body: 'Cards overflow on small screens.' });
    expect(prompt).toContain('reference/JULES_TASK_PROTOCOL.md');
    expect(prompt).toContain('wait for explicit plan approval');
    expect(prompt).toContain('Do not deploy Production');
  });

  it('maps Jules lifecycle states to AI Inbox states', () => {
    expect(mapJulesState('AWAITING_PLAN_APPROVAL')).toBe('awaiting_plan_approval');
    expect(mapJulesState('IN_PROGRESS')).toBe('running');
    expect(mapJulesState('COMPLETED')).toBe('done');
    expect(mapJulesState('FAILED')).toBe('failed');
  });
});
