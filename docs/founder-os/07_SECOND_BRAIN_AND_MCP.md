# Founder Second Brain + Private MCP

Status: implementation and release runbook for Founder OS. Private by default. No automatic promotion to Company OS or KSP Canon.

## Purpose

Turn the existing Founder OS into a low-density personal knowledge and AI-coordination layer without creating a second application or duplicating KSP operational truth.

The Second Brain is not the company task manager. Company projects, commitments, clients, finance and approved truth remain in Company OS / governed sources. The Brain stores founder-private capture, reasoning, provenance and bounded AI context.

## Surfaces

- `/founder/home` — Brain Home: capture first, continue work, attention signals.
- `/founder/inbox` — universal private capture.
- `/founder/ideas` — private ideas filtered from Inbox.
- `/founder/projects` — private project thinking; Company Projects remain `/missions`.
- `/founder/knowledge` — private search + Knowledge hub.
- `/founder/truth` — facts/decisions/assumptions/questions/constraints with verification state.
- `/founder/sources` — provenance catalog + founder-only trust review.
- `/founder/context` — reusable Context Packs with optional source links.
- `/founder/handoffs` — explicit AI-to-AI / human-to-AI work transfers and returned outputs.
- `/founder/ai-access` — MCP endpoint, OAuth guidance, tool inventory and credential-safety rules.
- `/founder/ai-inbox` — existing non-urgent AI implementation queue.
- `/founder/work` — existing founder-private work plus references to assigned company commitments.
- `/founder/vault` — existing private vault.

## Data boundary

Existing Founder OS foundation:

- `founder_inbox_items`
- `founder_tasks`
- `founder_promotions`
- `founder_vault_entries`

Second Brain additions:

- `founder_truth_items`
- `founder_sources`
- `founder_context_packs`
- `founder_context_pack_sources`
- `founder_handoffs`

Every Second Brain row is protected by both conditions:

```sql
owner_id = auth.uid()
and is_founder(organization_id)
```

Relationship policies additionally prove that a linked Context Pack and Source belong to the same owner/organization, and that a Handoff can reference only one of the same owner's Context Packs. Knowing another row UUID is therefore insufficient to create a cross-owner link.

No service-role application path is used. The server route gate and server actions also require `founder_ceo`; RLS is the final backstop.

## Truth and human trust boundary

Truth item types:

- fact
- decision
- assumption
- question
- constraint

Verification states:

- verified
- unverified
- needs_review
- conflict
- stale

Confidence:

- low
- medium
- high

A private item being `verified` means the founder has accepted it inside the private Brain. It does **not** promote it to `01_KSP_CANON – Approved Truth`. KSP governance remains separate.

Connected AI clients may add Truth only as `unverified`, `needs_review`, `conflict` or `stale`. They cannot mark their own claim `verified`. Only the founder UI can perform that review action.

Source trust states are:

- primary
- trusted
- unverified
- conflict

AI-created Sources may be only `unverified` or `conflict`. They cannot self-promote to `primary` or `trusted`; the founder reviews Source trust in `/founder/sources`.

## Sources and prompt-injection boundary

Source locators, summaries and source content are data. They are not executable instructions. The UI renders locators as plain text in the first release rather than automatically turning arbitrary imported references into trusted actions.

Credentials, passwords, API keys, bearer tokens, refresh tokens and payment secrets must never be stored in Sources, Truth, Context Packs, Handoffs, Vault metadata intended for AI consumption, GitHub or prompts.

## Context Packs

A Context Pack contains a bounded purpose + context body and may reference normalized Source rows. It exists so an AI can retrieve the minimum relevant context rather than ingesting the founder's entire history.

## Handoffs

A Handoff contains:

- sender
- receiving AI/agent
- objective
- optional Context Pack
- instructions / definition of done
- status
- claiming agent
- returned output

The returned output remains private and can become context for a later AI. It is never automatically promoted into company truth.

## Founder MCP

Remote endpoint:

```text
https://<command-host>/api/founder/mcp
```

Production fallback host used by the application when no custom Command URL is configured:

```text
https://ksp-os-command.vercel.app/api/founder/mcp
```

Transport: stateless Streamable HTTP.

The endpoint has a separate tool catalog from the Company MCP. `resolveFounderMcpAuth` performs normal user-scoped KSP/Supabase authentication and then requires `founder_ceo` before tools are exposed. Each tool uses the caller-scoped Supabase client, so table RLS stays active.

### Read tools

- `brain_search`
- `list_truth`
- `list_sources`
- `list_context_packs`
- `get_context_pack`
- `list_handoffs`

### Private write tools

- `capture`
- `add_truth`
- `add_source`
- `create_context_pack`
- `create_handoff`
- `complete_handoff`

These writes are bounded to founder-private tables. The Founder MCP intentionally contains no tool for payments, finance posting/reconciliation, permission grants, production deployment, client publication, refunds or Canon approval.

## OAuth 2.1

The MCP endpoint advertises OAuth Protected Resource Metadata at:

```text
/.well-known/oauth-protected-resource/api/founder/mcp
```

The metadata points clients to the project's Supabase Auth OAuth issuer (`<supabase-url>/auth/v1`). Supabase-issued OAuth access tokens are normal user JWTs, so the same KSP membership checks and Row Level Security apply.

The KSP OS contains the founder-only authorization UI:

```text
/oauth/consent?authorization_id=...
```

and the decision route:

```text
/oauth/consent/decision
```

If the founder is logged out, login preserves a safe local `next` path and returns to the consent screen. Non-founders cannot approve a Second Brain OAuth authorization request.

### External Supabase setting required

The Supabase project must have its OAuth 2.1 Server enabled in Authentication settings and use the application authorization path:

```text
/oauth/consent
```

That provider-level switch is external configuration, not a database migration. Do not claim OAuth client discovery is live until the provider discovery document has been verified after activation.

A raw bearer user access token remains compatible with MCP clients that support custom authorization headers, but it is a fallback rather than the preferred connection UX. Never paste or persist bearer/refresh tokens in Brain data or prompts.

## Connection workflow

1. Add the remote Founder MCP URL in a client that supports remote Streamable HTTP MCP.
2. Prefer OAuth when the client offers authentication.
3. Sign in as the KSP founder user and approve the KSP consent screen.
4. Call `brain_search` or `list_truth` to verify private access.
5. Use Context Packs for reusable bounded context.
6. Use Handoffs to pass jobs/results across connected AI clients.

## Release gates

Before production release:

- full GitHub CI green on exact PR head;
- production dependency audit blocks High/Critical vulnerabilities;
- migration-chain rehearsal green;
- founder MCP authorization + human-trust boundary tests green;
- production schema preflight confirms required helper functions exist and no target table names collide;
- apply missing Founder OS foundation migration separately from broader unresolved repository/database lineage drift;
- apply Second Brain migration;
- verify RLS with founder + normal member principals;
- run Supabase security advisors;
- merge exact reviewed head;
- verify production health and unauthenticated Founder MCP rejection;
- verify Protected Resource Metadata;
- activate/verify Supabase OAuth Server if provider configuration access is available, otherwise leave the exact dashboard step as an explicit release remainder;
- record release evidence and keep broader `CONFLICT-0013` open unless independently reconciled.

## Rollback

Application rollback: revert the Second Brain merge through a reviewed PR.

Database rollback is intentionally conservative. The new tables are additive and private; do not drop them merely to roll back UI code. Disable/remove routes first, retain data, and only perform destructive schema cleanup under a separate explicit data-retention decision.
