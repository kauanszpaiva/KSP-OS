# AI Connector — Claude (MCP) & ChatGPT (Actions)

Exposing KSP Command OS to an external AI so it can help operate the business,
**within the governance blueprint** (`reference/CLAUDE.md`). This documents what
is built now (a safe read foundation) and what remains gated on human approval.

## Guardrails (non-negotiable, from the blueprint)

- **No service-role for user actions.** Every request runs as a real user via a
  Supabase access token, so **RLS is the enforcement backbone** — the AI can
  never see or do more than that signed-in person can.
- **A4 (full autonomy) is prohibited.** External/material actions are **A3**:
  explicit human approval per action. So the connector is **read-first**; writes
  are added behind an approval step, never as silent autonomy.
- **Sensitive actions** (finance post/reconcile, access.grant/revoke, deploy,
  refunds) stay human-gated and are out of connector scope.
- **No unapproved dependencies.** The read API below adds **zero** new
  dependencies. The Claude MCP server needs the MCP SDK — that is an explicit
  approval gate (below), not something added silently.
- Every integration must satisfy the **Integration Standard** and **Release
  Gate** in `INTEGRATION_CATALOG.md` before Production.

## What is built now — read-only foundation (no new deps)

- **`createTokenClient(accessToken)`** (`packages/database/src/clients.ts`) — a
  Supabase client bound to a user's access token. RLS applies as that user; not
  service-role.
- **`GET /api/v1/{resource}`** (`apps/command/app/api/v1/[resource]/route.ts`) —
  Bearer-authenticated reads. Resources: `me`, `missions`, `clients`,
  `tasks`, `outcomes`, `commitments`. Reuses the existing RLS-scoped `data.ts`
  fetchers. Only internal members (active membership via `getAuthContext`) pass.
- **`POST /api/v1/{tasks,comments,missions}`** — low-risk internal writes
  (the A1/A2 tier). Each runs under the caller's token + RLS, validates with the
  existing `@ksp/validation` schemas, checks `canPerform` where the module does
  (missions → `project.manage`), and writes an `activity_events` +
  `audit_events` trail tagged `via: 'ai_connector'`. **Sensitive/material
  actions are not exposed** (no finance, access grants, deploys, or
  publish-to-client), keeping those A3/human-gated.
- **`public/openapi.json`** — OpenAPI 3.1 describing the read + write API. A
  ChatGPT Custom GPT / Action can consume this directly.

Safe to ship: user-scoped, RLS-enforced, audited, with sensitive actions walled
off.

## ChatGPT (Actions) — usable today for reads

1. Deploy the command app; the spec is served at `/openapi.json` (edit the
   `servers[0].url` to your host).
2. In a **Custom GPT → Actions**, import that URL.
3. Auth = **Bearer**; supply a Supabase user access token for the operator the
   GPT acts as. The GPT then answers from live, RLS-scoped KSP data.

> Tokens are user-scoped and expire — treat them as secrets, rotate them, and
> issue one per operator. A first-class OAuth handshake is a follow-up.

## Claude (MCP) — shipped as a remote server

> **Update:** Gate #1 below (add `@modelcontextprotocol/sdk`) is **approved and
> implemented.** A remote MCP server now lives in `apps/command` at
> `/api/mcp` and reuses this same auth model, RLS-scoped fetchers, and write
> governance. See [`mcp-server.md`](./mcp-server.md). The stdio scaffold below is
> retained only as a minimal reference.

Adding `@modelcontextprotocol/sdk` was a **new dependency → approval gate**. It
is now added (with `mcp-handler`) to `apps/command`, and the remote server wraps
the same domain — no business logic of its own. Minimal stdio reference scaffold:

```ts
// packages/mcp-server/src/index.ts  (illustrative — not yet wired into the build)
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = process.env.KSP_API_BASE!;          // https://<command-host>/api/v1
const TOKEN = process.env.KSP_ACCESS_TOKEN!;     // per-operator Supabase token

async function read(resource: string) {
  const res = await fetch(`${BASE}/${resource}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!res.ok) throw new Error(`${resource}: ${res.status}`);
  return res.json();
}

const server = new McpServer({ name: 'ksp-command', version: '1.0.0' });
for (const r of ['me', 'missions', 'clients', 'tasks', 'outcomes', 'commitments']) {
  server.tool(`list_${r}`, `Read ${r} from KSP Command OS (RLS-scoped).`, {}, async () => ({
    content: [{ type: 'text', text: JSON.stringify(await read(r)) }]
  }));
}
await server.connect(new StdioServerTransport());
```

Add to Claude Desktop / Claude Code as an MCP server pointing at that process,
with `KSP_API_BASE` and `KSP_ACCESS_TOKEN` in its env.

## Write path

**Low-risk writes are live** (A1/A2): `POST /api/v1/tasks`, `/comments`,
`/missions`. They run as the caller (token + RLS), validate with the shared
schemas, honour `canPerform` where the module does, and audit every write.
Sensitive/material actions are deliberately excluded.

**Sensitive/material actions — propose, never execute (A3):** the connector
cannot run finance, access-grant, deploy, or publish-to-client actions. Instead
`POST /api/v1/proposals` files an **approval request** (into the existing
`approval_requests` module) that a human decides in the Decisions tab — the AI
proposes, a person approves and carries it out. Nothing material happens
autonomously. Wiring an *approved* proposal to auto-execute the underlying
mutation is a further step that still needs the full A3 sign-off (executive +
security/domain owner, canary, kill-switch test) and the Integration Standard +
Release Gate before it ships.

## Approval gates

1. ~~**Add `@modelcontextprotocol/sdk`** as a dependency for the MCP server.~~
   **Done** — `@modelcontextprotocol/sdk` + `mcp-handler` added to
   `apps/command`; remote server at `/api/mcp` (see `mcp-server.md`).
2. **External-auth model** — per-operator bearer tokens (current) vs. a full
   OAuth flow for the GPT/MCP client (follow-up; the MCP endpoint is already
   OAuth-upgradeable).
3. **Write scope** — which mutations (if any) the connector may perform behind
   the A3 approval step. The MCP `create_task` write is behind
   `MCP_ENABLE_WRITE_TOOLS` (off by default) pending this decision.
