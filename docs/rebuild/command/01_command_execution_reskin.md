# Phase C1 — Re-skin the 5 Live Modules

Group: Command · Status: ✅ done & verified (see checks log in `STATUS.md`)

Goal: bring Pulse, Focus, Outcomes, Commitments, and Founder Vault onto the
new design system (Phase C0) without changing their behavior — same data,
same permissions, same server actions — just the new visual language plus
entrance motion.

## Tasks

| Task | Status | What changed |
|---|---|---|
| C1.1 Pulse | ✅ | Narrative status line, attention ledger, flow figures, active outcomes, and activity feed now use `Reveal` for staggered entrance; attention-ledger rows get a hover background; empty state uses the `pulse` icon. No data/behavior change. |
| C1.2 Focus | ✅ | Each time band (Now/Next 2 days/This week/Later) reveals with an incremental delay; commitment cards get a hover elevation (`border`/`shadow` transition); empty state uses the `focus` icon. |
| C1.3 Outcomes | ✅ | The 3-slot governor lane and the open-slot placeholder both animate in with a per-index delay; card hover raises `border`/`shadow`; unchanged: the 3-active-outcome DB-enforced limit and executive-only mutation gating. |
| C1.4 Commitments | ✅ | In-review/Active/Closed groups reveal in sequence; the "New commitment" disclosure animates open; per-row hover background on the commitment `<details>`; empty state uses the `commitments` icon. |
| C1.5 Founder Vault | ✅ | Vault entries stagger in on load; empty state uses the `vault` icon; the save button now uses `bg-ink`/`text-canvas` (a theme-correct inverse pair) instead of a hardcoded `text-white`, so it stays legible in both themes. |
| Shared | ✅ | `apps/command/app/(app)/_components/ui.tsx` (`Panel`, `Rail`, `Ring`) updated: rounded to `rounded-xl` + `shadow-card`; `Rail` fill transitions on width change; `Ring` stroke uses semantic `stroke-brand`/`stroke-accent` (green once 100%) instead of a hardcoded hex, and animates its dash-offset. `_components/forms.tsx`, `vault-form.tsx`, `login/page.tsx`, `setup/page.tsx` updated for the new radii/tokens and press/focus micro-interactions. |

## What was intentionally NOT changed

- Server actions (`(app)/actions.ts`), data functions (`(app)/data.ts`), Zod
  schemas, RLS, and the 3-outcome / proof-acceptance / executive-only
  invariants — none of this is UI, so none of it changed here.
- No new routes, no new tables in this phase.

## Verification actually run

See `docs/rebuild/STATUS.md`. Manual: exercised the create-outcome,
create-commitment, submit-proof, and accept/reject-completion flows in the
dev server in both themes; confirmed the founder-only Vault redirect still
fires for non-founders; checked 375px width for horizontal-scroll regressions
on all 5 pages.
