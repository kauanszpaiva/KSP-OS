# ADR 0001 — GitHub integration identity: GitHub App vs. personal access token

Status: **Proposed** (requires Kauan's approval before Phase 1 — see `12_OPEN_QUESTIONS_AND_DECISIONS.md` D2)
Date: 2026-07-23

## Context

The Activity Hub needs to authenticate against GitHub to receive webhooks and make REST calls (backfill, reconciliation, rate-limit-respecting polling per `01_INTEGRATION_CAPABILITY_MATRIX.md` G1–G8). Two authentication models are available: a GitHub App (installed at the organization or repository level, with its own identity and scoped permissions) or a classic/fine-grained personal access token (PAT) issued under one human's GitHub account.

## Decision

Use a **GitHub App**, installed at the organization level, scoped to the specific repositories the Hub needs.

## Alternatives considered

- **Personal access token** under one KSP staff member's account.

## Advantages of the GitHub App approach

- Identity is the integration itself, not a person — survives staff turnover without re-issuing credentials tied to an individual.
- Permissions are scoped per-installation (read-only where sufficient, e.g., no write access needed for pure activity ingestion).
- Webhook secret and signature verification are first-class App concepts, not bolted on.
- Revocation is a single, clear action (uninstall the App) rather than hunting down and rotating a PAT.

## Disadvantages

- Requires an org-owner action to install (a one-time setup cost, needs a human with org-admin rights on KSP's GitHub organization).
- Slightly more setup complexity than "paste a token" for a first prototype.

## Security impact

Materially better than a PAT: scoped permissions, app-level identity, and cleaner audit trail of what the integration can and cannot do. Consistent with `06_SECURITY_PRIVACY_AND_TRUST.md`'s least-privilege principle.

## Operational impact

One-time install/config step per repository (or org-wide install with per-repo selection). No ongoing operational burden beyond normal credential rotation (`10_OPERATIONS_AND_RUNBOOKS.md` R12).

## Cost impact

None — GitHub Apps require no paid tier.

## Reversibility

Fully reversible — uninstalling the App and switching to a PAT (or vice versa) does not require a data migration, only re-pointing the ingestion handler's authentication.
