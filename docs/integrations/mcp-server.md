# MCP Server — KSP Command OS

A remote **Model Context Protocol (MCP)** server hosted inside `apps/command`,
served as a Vercel Function. It exposes Command OS as MCP tools so Claude and
ChatGPT can connect to it as a **custom connector** and operate on live,
RLS-scoped data — within the governance blueprint (`reference/CLAUDE.md`,
`SECURITY_RELIABILITY_AND_COMPLIANCE.md`, `ACCESS_CONTROL_AND_APPROVALS.md`).

It is the native-MCP sibling of the REST AI connector in
[`ai-connector.md`](./ai-connector.md): both reuse the same auth model, the same
RLS-scoped domain fetchers, and the same write governance — no duplicated logic.

## Endpoint

- **Route:** `apps/command/app/api/[transport]/route.ts`
- **Transport:** stateless Streamable HTTP (SSE disabled → **no Redis** needed).
- **Dev:** `http://localhost:3000/api/mcp`
- **Production:** `https://ksp-os-command.vercel.app/api/mcp`

`basePath` is `/api`, so the `[transport]` segment resolves to `mcp` and the one
connector URL is `/api/mcp`. Static sibling routes (`/api/health`, `/api/v1/*`)
keep precedence over the dynamic segment.

## Authentication

Bearer token, identical to the v1 connector. Send a **Supabase user access
token** as `Authorization: Bearer <token>`:

1. `withMcpAuth({ required: true })` rejects any request without a valid token
   and returns the correct `WWW-Authenticate` challenge.
2. `resolveMcpAuth` (`lib/mcp/context.ts`) builds a **user-scoped** Supabase
   client from the token (`createTokenClient`) and requires an active internal
   membership (`getAuthContext`). Table **RLS is the enforcement backbone**.
3. Every tool call runs under that same token — the connector can never see or
   do more than the operator can in the app. **There is no service-role path.**

> Tokens are per-operator and expire. Treat them as secrets, issue one per
> operator, and rotate them. A first-class OAuth handshake is a documented
> follow-up (the MCP endpoint already emits RFC 9728-style challenges via
> `withMcpAuth`, so it is OAuth-upgradeable without changing the tool layer).

## Tools

Read tools (always on) reuse the RLS-scoped fetchers in `app/(app)/data.ts` and
return curated projections:

| Tool | Params | Returns |
| --- | --- | --- |
| `whoami` | — | Acting member, organization, and internal roles. |
| `list_missions` | `limit?` | Missions/projects: id, name, type, status, health, client, milestone/member counts. |
| `list_tasks` | `status?`, `limit?` | Workspace tasks: id, title, status, blocked, owner, project, dates. |
| `list_clients` | `limit?` | Clients: id, name, status, health, contacts (name/email), internal note **count** (bodies excluded). |

Write tool (**off by default**, behind `MCP_ENABLE_WRITE_TOOLS=true`):

| Tool | Tier | Notes |
| --- | --- | --- |
| `create_task` | A1/A2 low-risk | Validates with the shared `createTaskSchema`, writes under the caller's token, emits an `activity_events` + `audit_events` trail tagged `via: 'mcp_connector'`, and returns exactly what was written. |

Sensitive/material actions (finance post/reconcile, access grant/revoke, deploy,
publish-to-client, refunds) are **not exposed**. They remain human-gated (A3):
the REST connector's `POST /api/v1/proposals` files an approval request a human
decides in the Decisions module. Bringing that A3 proposal path to MCP is a
future slice.

## Connect from Claude

1. Deploy the command app (or run it locally and expose it).
2. In Claude: **Settings → Connectors → Add custom connector** (or
   **Customize → Connectors → “+”**).
3. **URL:** `https://ksp-os-command.vercel.app/api/mcp`
4. **Auth:** Bearer token — paste the operator's Supabase access token.
5. Claude lists the tools. Call `whoami` first to confirm the connection is
   authenticated as the right member.

## Connect from ChatGPT

1. Enable **Developer Mode** (Settings → Connectors → Advanced).
2. **Add** a connector by **URL:** `https://ksp-os-command.vercel.app/api/mcp`.
3. Provide the Bearer token as the auth credential.
4. The tools become available in the conversation.

## Test locally with the MCP Inspector

```bash
pnpm dev:command                       # serves http://localhost:3000
# Get a Supabase user access token for a provisioned internal member, then:
npx @modelcontextprotocol/inspector
# In the Inspector UI:
#   Transport:      Streamable HTTP
#   URL:            http://localhost:3000/api/mcp
#   Authentication: Bearer  ->  <SUPABASE_USER_ACCESS_TOKEN>
# Connect, list tools, and call `whoami`. A request with no/invalid token
# must be rejected with 401 before any tool is reachable.
```

## Adding a new tool (keep the governance)

1. **Reuse the domain.** Add the tool descriptor in `lib/mcp/tools.ts` and call
   an existing RLS-scoped fetcher in `app/(app)/data.ts`. Do not add a new query
   path or use `createServiceClient` — always operate on `ctx.supabase`.
2. **Zod schema + specific description.** Give the tool a precise `inputSchema`
   and a clear description; reuse a `@ksp/validation` schema for writes.
3. **Reads vs. writes.** A read returns a curated projection. A write must be
   low-risk (A1/A2), validated, audited (`activity_events` + `audit_events`),
   and it must return explicitly what changed. Register it behind
   `MCP_ENABLE_WRITE_TOOLS`. Sensitive/material actions stay A3 (propose, never
   execute).
4. **Test it.** Add schema/validation and authorization coverage in
   `lib/mcp/mcp.test.tsx` (a call without a valid member must fail closed).
5. **Document it** in the tool table above.

## Environment

- `MCP_ENABLE_WRITE_TOOLS` — optional. `true` enables `create_task`; unset keeps
  the server read-only. Server-only; never a `NEXT_PUBLIC_` variable.
- Reuses the existing Supabase public env (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). **No** service-role key is used by the
  MCP server.
