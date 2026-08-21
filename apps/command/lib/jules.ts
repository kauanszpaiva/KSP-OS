const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface JulesGithubRepo {
  owner?: string;
  repo?: string;
  defaultBranch?: string;
}

export interface JulesSource {
  name: string;
  id?: string;
  githubRepo?: JulesGithubRepo;
}

export interface JulesSession {
  name: string;
  id?: string;
  state?: string;
  url?: string;
  outputs?: Array<{
    pullRequest?: {
      url?: string;
      title?: string;
      description?: string;
    };
  }>;
}

interface JulesListSourcesResponse {
  sources?: JulesSource[];
  nextPageToken?: string;
}

interface JulesClientOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface CreateRepositorySessionInput {
  owner: string;
  repo: string;
  startingBranch?: string;
  title: string;
  prompt: string;
}

export class JulesApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = 'JulesApiError';
  }
}

function configuredApiKey(explicit?: string): string {
  const value = explicit?.trim() || process.env.JULES_API_KEY?.trim();
  if (!value) throw new JulesApiError('Google Jules is not configured.');
  return value;
}

function safeProviderMessage(status: number): string {
  if (status === 401 || status === 403) return 'Google Jules rejected the configured API credential.';
  if (status === 404) return 'Google Jules could not find the requested resource.';
  if (status === 429) return 'Google Jules rate limit was reached. Try again later.';
  if (status >= 500) return 'Google Jules is temporarily unavailable.';
  return `Google Jules request failed (${status}).`;
}

export function createJulesClient(options: JulesClientOptions = {}) {
  const apiKey = configuredApiKey(options.apiKey);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${JULES_API_BASE}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
          ...(init.headers ?? {})
        },
        signal: controller.signal
      });
      if (!response.ok) throw new JulesApiError(safeProviderMessage(response.status), response.status);
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof JulesApiError) throw error;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new JulesApiError('Google Jules request timed out.');
      }
      throw new JulesApiError('Google Jules could not be reached.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async function findGithubSource(owner: string, repo: string): Promise<JulesSource> {
    let pageToken: string | undefined;
    for (let page = 0; page < 20; page += 1) {
      const params = new URLSearchParams({ pageSize: '100' });
      if (pageToken) params.set('pageToken', pageToken);
      const response = await request<JulesListSourcesResponse>(`/sources?${params.toString()}`);
      const source = (response.sources ?? []).find(
        candidate =>
          candidate.githubRepo?.owner?.toLowerCase() === owner.toLowerCase() &&
          candidate.githubRepo?.repo?.toLowerCase() === repo.toLowerCase()
      );
      if (source) return source;
      pageToken = response.nextPageToken;
      if (!pageToken) break;
    }
    throw new JulesApiError(`Repository ${owner}/${repo} is not connected to Google Jules.`);
  }

  async function createRepositorySession(input: CreateRepositorySessionInput): Promise<JulesSession> {
    const source = await findGithubSource(input.owner, input.repo);
    const branch = input.startingBranch || source.githubRepo?.defaultBranch || 'main';
    return request<JulesSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        prompt: input.prompt,
        sourceContext: {
          source: source.name,
          githubRepoContext: { startingBranch: branch }
        },
        requirePlanApproval: true,
        automationMode: 'AUTO_CREATE_PR'
      })
    });
  }

  async function getSession(sessionName: string): Promise<JulesSession> {
    const normalized = sessionName.startsWith('sessions/') ? sessionName : `sessions/${sessionName}`;
    return request<JulesSession>(`/${normalized}`);
  }

  async function approvePlan(sessionName: string): Promise<JulesSession> {
    const normalized = sessionName.startsWith('sessions/') ? sessionName : `sessions/${sessionName}`;
    return request<JulesSession>(`/${normalized}:approvePlan`, {
      method: 'POST',
      body: '{}'
    });
  }

  return { findGithubSource, createRepositorySession, getSession, approvePlan };
}

export function buildJulesTaskPrompt(input: { title: string; body?: string | null }): string {
  return [
    `Issue: ${input.title}`,
    input.body ? `Business outcome / context:\n${input.body}` : null,
    'Base branch: main',
    'Read the repository root AGENTS.md, reference/AGENTS.md, and reference/JULES_TASK_PROTOCOL.md before editing.',
    'Produce a plan first and wait for explicit plan approval before material edits.',
    'Work only on the smallest paths required for this request. Do not modify unrelated files.',
    'Do not use, request, expose, rotate, or change Production secrets or credentials.',
    'Do not deploy Production, merge your own work, weaken RLS/auth/audit/tests, or perform destructive migrations.',
    'Run the narrowest relevant checks and then the repository-required checks that apply.',
    'Return the work through a branch/pull request with a concise handoff including files changed, tests, security/data impact, and unresolved issues.'
  ].filter(Boolean).join('\n\n');
}

export function julesSessionPullRequestUrl(session: JulesSession): string | null {
  for (const output of session.outputs ?? []) {
    if (output.pullRequest?.url) return output.pullRequest.url;
  }
  return null;
}

export function mapJulesState(state?: string): string {
  switch (state) {
    case 'AWAITING_PLAN_APPROVAL': return 'awaiting_plan_approval';
    case 'AWAITING_USER_FEEDBACK': return 'needs_feedback';
    case 'IN_PROGRESS': return 'running';
    case 'PAUSED': return 'paused';
    case 'COMPLETED': return 'done';
    case 'FAILED': return 'failed';
    case 'PLANNING': return 'planning';
    case 'QUEUED': return 'dispatched';
    default: return 'dispatched';
  }
}
