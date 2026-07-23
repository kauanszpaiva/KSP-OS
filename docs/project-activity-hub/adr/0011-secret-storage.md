# ADR 0011 — Secret storage mechanism

Status: **Proposed** (`12_OPEN_QUESTIONS_AND_DECISIONS.md` D7)
Date: 2026-07-23

## Context

The Hub needs to store webhook secrets, GitHub App private keys/installation tokens, and (if D12/D13 are approved) Anthropic/OpenAI admin API keys. `00_CURRENT_SYSTEM_AUDIT.md` §19 found no secret-storage pattern beyond standard Vercel environment variables in the repo today.

## Decision

Use **Vercel environment variables** (the repo's existing, only convention) for Phase 0–3. Do not introduce Supabase Vault or a dedicated secrets manager unless credential volume or rotation frequency genuinely outgrows this — a decision to be revisited, not pre-emptively solved.

## Alternatives considered

- **Supabase Vault** — application-level encrypted secret storage inside Postgres. More sophisticated rotation/audit ergonomics, but a new mechanism the repo doesn't use anywhere else today, and not yet justified by the credential volume this plan introduces (a handful of provider secrets, not a large or dynamically-changing set).
- **A dedicated third-party secrets manager.** Rejected outright: a new vendor/service with no documented need, in direct conflict with `reference/AGENTS.md`'s governance rule.

## Advantages

Zero new infrastructure; consistent with every other credential KSP OS already manages this way.

## Disadvantages

Vercel environment variables are coarser-grained (project-wide, not fine-grained per-secret access control) and rotation requires a redeploy — an accepted trade-off at KSP's current secret volume.

## Security impact

No secret ever appears in the repo, logs, or Hub tables (this is a hard rule tested in `08_TEST_AND_VERIFICATION_PLAN.md`'s "provider-token leakage" test) regardless of which storage mechanism is used — this ADR is about *where* the secret lives operationally, not about relaxing that rule.

## Operational impact

Rotation requires a redeploy (`10_OPERATIONS_AND_RUNBOOKS.md` R12) — acceptable at current scale, would become a friction point worth revisiting if rotation frequency increases materially.

## Cost impact

None.

## Reversibility

Fully reversible — migrating to a different secret-storage mechanism later doesn't affect the data model, only how the application reads its own credentials at runtime.
