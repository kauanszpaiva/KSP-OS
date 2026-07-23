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
  Bearer-authenticated, read-only. Resources: `me`, `missions`, `clients`,
  `tasks`, `outcomes`, `commitments`. Reuses the existing RLS-scoped `data.ts`
  fetchers. Only internal members (active membership via `getAuthContext`) pass.
- **`public/openapi.json`** — OpenAPI 3.1 describing the read API. A ChatGPT
  Custom GPT / Action can consume this directly.

This foundation is safe to ship: read-only, user-scoped, RLS-enforced, audited
by Supabase's own logs.

## ChatGPT (Actions) — usable today for reads

1. Deploy the command app; the spec is served at `/openapi.json` (edit the
   `servers[0].url` to your host).
2. In a **Custom GPT → Actions**, import that URL.
3. Auth = **Bearer**; supply a Supabase user access token for the operator the
   GPT acts as. The GPT then answers from live, RLS-scoped KSP data.

> Tokens are user-scoped and expire — treat them as secrets, rotate them, and
> issue one per operator. A first-class OAuth handshake is a follow-up.

## Claude (MCP) — scaffold, gated on the MCP SDK dependency

Adding `@modelcontextprotocol/sdk` is a **new dependency → needs approval**. Once
approved, a thin MCP server (its own small package, e.g. `packages/mcp-server`)
wraps the same read API — no business logic of its own. Reference scaffold:

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

## Write path — the A3 follow-up (design, not built)

To let the AI *do* things (create a task, add a comment, move a Kanban card):

1. **Extract command handlers.** Today mutation logic is inlined in server
   actions (`apps/command/app/(app)/actions.ts`). Lift each into a
   framework-neutral function `(ctx, input) -> result` reusing `@ksp/permissions`
   + `@ksp/validation`. Both the server action and a new `POST /api/v1/...`
   then call the same handler.
2. **Approval gate (A3).** A write request creates a **pending action** the
   operator confirms in-app before it executes — never auto-applied. Sensitive
   actions remain blocked entirely.
3. **Audit.** Every connector write goes through the existing `record()` →
   `activity_events` + `audit_events`.
4. **Integration Standard + Release Gate** signed off before Production.

## Approval gates (need a human decision before proceeding)

1. **Add `@modelcontextprotocol/sdk`** as a dependency for the MCP server.
2. **External-auth model** — per-operator bearer tokens now vs. a full OAuth
   flow for the GPT/MCP client.
3. **Hosting** for the MCP server process (it must reach the command host).
4. **Write scope** — which mutations (if any) the connector may perform behind
   the A3 approval step.
