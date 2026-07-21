# KSP Dominion OS — Information Architecture

Role-aware navigation, defined in `apps/command/lib/nav.ts`. Items are marked
`live` (implemented in this slice) or `planned` (surfaced but disabled — no fake
data behind them).

## Navigation groups

| Group | Modules | Status |
|---|---|---|
| Command | Pulse `live`, Focus `live`, Signals `planned`, Decisions `planned` |
| Execution | Outcomes `live`, Commitments `live`, Missions/Schedule/Horizon/Team `planned` |
| Growth | Revenue, Clients, Products, Content — all `planned` |
| Control | Finance, Software, Knowledge, Connections — all `planned` |
| Private | Founder Vault `live`, founder-only |

`Missions` is added to Execution (the blueprint lists Missions under Execution);
Outcomes and Commitments are the implemented anchors of Execution today.

## Desktop

- Collapsible left sidebar (`apps/command/app/(app)/_components/shell.tsx`), grouped, with active-state highlighting.
- Collapse toggle persists layout; collapsed mode shows initials for live items only.
- Header shows the signed-in user, role label, and sign-out.

## Mobile (≤ lg)

- Five primary destinations in a fixed bottom bar: Pulse, Focus, Signals, Commitments, **More**.
- **More** opens a sheet listing every group/module.
- The desktop sidebar is hidden; the layout is not a squeezed desktop view.
- Verified constraint: **no unintended horizontal scroll at 375px** (`overflow-x-hidden` on the shell, `min-w-0` on flex children, responsive grids). Covered by an e2e assertion.

## Module composition principle

Each live module has a distinct primary composition, not a shared card grid:

- **Pulse** — narrative banner + attention-zone list + outcome strip + risk lists.
- **Focus** — temporal runway grouped into Now / Next 2 days / This week / Later.
- **Outcomes** — governor meter + outcome cards + activation form.
- **Commitments** — operational cards with inline progress/proof/decision controls.
- **Founder Vault** — private ledger with entry composer.
