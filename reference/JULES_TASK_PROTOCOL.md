# Jules Task Protocol

Use Jules only for bounded repository tasks that can safely run in an isolated VM and return through a branch/pull request.

## Suitable tasks

- well-specified defect fixes;
- test expansion;
- documentation updates;
- repetitive safe refactors;
- dependency maintenance after approval;
- pattern migration across a known set of files;
- non-urgent isolated implementation with complete acceptance criteria.

## Unsuitable tasks

- ambiguous product design;
- executive-access changes;
- unreviewed finance/posting logic;
- payment execution;
- secret rotation;
- Production incidents/deployment;
- destructive migrations;
- broad architecture changes without ADR;
- tasks requiring real client/Production data.

## Required task contract

```text
Issue:
Business outcome:
Base branch:
Allowed paths:
Forbidden paths:
In scope:
Out of scope:
Business invariants:
Authorization rules:
Data classification:
Acceptance criteria:
Required tests/commands:
Prohibited actions:
Expected PR/handoff:
Escalation conditions:
```

## Execution sequence

1. Read root and nested `AGENTS.md`.
2. Inspect relevant code/tests.
3. Produce a plan before material edits.
4. Receive plan approval when required.
5. Work only in the isolated branch/VM and allowed paths.
6. Run required checks.
7. Review diff for scope, secrets, permissions, and migration impact.
8. Open/prepare PR.
9. Provide handoff: summary, files, assumptions, tests, data/security impact, unresolved issues.

## Review rule

Jules output is an untrusted contribution until CI, CODEOWNERS, domain review, and applicable human approval pass. Jules never merges or deploys Production.
