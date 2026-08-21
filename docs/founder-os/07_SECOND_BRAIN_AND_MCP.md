# Founder Second Brain + Private MCP

Status: implementation slice for Founder OS. Private by default. No automatic promotion to Company OS or KSP Canon.

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
- `/founder/sources` — provenance catalog.
- `/founder/context` — reusable Context Packs with optional source links.
- `/founder/handoffs` — explicit AI-to-AI / human-to-AI work transfers and returned outputs.
- `/founder/ai-access` — MCP endpoint, tool inventory and credential-safety guidance.
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

No service-role application path is used. The server route gate and server actions also require `founder_ceo`; RLS is the final backstop.

## Truth semantics

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

Current auth model: bearer Supabase user access token. `resolveFounderMcpAuth` first performs normal KSP MCP authentication and then requires `founder_ceo` before the private tool catalog is exposed. Each tool rebuilds the user-scoped Supabase client, so table RLS remains active.

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

## Connection workflow

1. Add the remote Founder MCP URL in a client that supports remote Streamable HTTP MCP.
2. Authenticate as the KSP founder user; never paste the bearer token into a conversation or store it in Brain data.
3. Call `brain_search` or `list_truth` to verify private access.
4. Use Context Packs for reusable bounded context.
5. Use Handoffs to pass jobs/results across connected AI clients.

Bearer access tokens expire. A durable OAuth 2.1 authorization flow is the preferred evolution. Supabase Auth can act as an OAuth 2.1/OIDC authorization server, but enabling that provider and consent path is a separate auth rollout and must not be confused with the already-working bearer/RLS model.

## Release gates

Before production release:

- full GitHub CI green on exact PR head;
- migration-chain rehearsal green;
- founder MCP authorization tests green;
- production schema preflight confirms required helper functions exist and no target table names collide;
- apply missing Founder OS foundation migration separately from broader unresolved repository/database lineage drift;
- apply Second Brain migration;
- verify RLS with founder + normal member principals;
- run Supabase security advisors;
- merge exact reviewed head;
- verify production health and unauthenticated Founder MCP rejection;
- record release evidence and keep broader `CONFLICT-0013` open unless independently reconciled.

## Rollback

Application rollback: revert the Second Brain merge through a reviewed PR.

Database rollback is intentionally conservative. The new tables are additive and private; do not drop them merely to roll back UI code. Disable/remove routes first, retain data, and only perform destructive schema cleanup under a separate explicit data-retention decision.
