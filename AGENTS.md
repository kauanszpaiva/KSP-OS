# AGENTS.md

Follow the blueprint and `reference/AGENTS.md`. Build secure vertical slices with domain rules, validation, RLS, audit, tests, docs, and rollback notes. Never commit secrets or production data. Do not weaken RLS, audit, approval, or financial invariants.

## Spec compliance gate

`Spec` is the mandatory KSP-OS plan-to-code compliance protocol. Read `docs/spec/README.md` before planning, implementing, reviewing, or declaring work complete.

For every material change:

- declare the authoritative spec/source documents before editing;
- turn the affected scope into explicit, testable requirements;
- compare spec -> code -> data/RLS -> tests -> CI -> docs;
- record evidence and searches, not just conclusions;
- classify each requirement as `implemented`, `partial`, `absent`, `contradicted`, or `undecidable`;
- classify consequential divergences by severity and state whether code or documentation is wrong;
- resolve or explicitly gate material gaps before Ready for review/merge;
- never weaken security, finance, audit, validation, tests, or production controls to make the matrix look green.

When documents conflict, do not silently choose one. Record the conflict and apply the precedence rules in `docs/spec/README.md`.
