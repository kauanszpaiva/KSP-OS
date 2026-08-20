# KSP Dominion OS — Information Architecture

KSP OS is intentionally **simple at the surface and deep underneath**. The product can contain more operational capability than a conventional project-management tool without forcing every user to understand every object, view, or control before they can act.

The information architecture is role-aware and defined in `apps/command/lib/nav.ts`. Existing security, RLS, approvals, audit, and domain rules remain authoritative regardless of which surface exposes the data.

## Product rule

> Complexity belongs in the system, not in the user's head.

The default experience should answer a question before it exposes a module. Advanced views are available when needed, but they do not compete with the daily workflow for attention.

## Three-layer model

### Layer 1 — Simple surface

The default mobile and desktop entry layer has four destinations:

| Destination | Question it answers | Primary content |
|---|---|---|
| **Home** | How is the company doing and what needs me? | One next priority, attention signals, project health |
| **Today** | What should I do now? | Blocked/overdue, today, this week, later |
| **Projects** | What are we building or delivering? | Active projects, milestones, dependencies, health |
| **Inbox** | What needs interpretation or approval? | Signals and pending decisions |

Mobile adds **More** as the fifth navigation item. More is the gateway to the full operating system.

The simple surface is guidance-first. It aggregates existing RLS-scoped records and links into the authoritative specialist workflows rather than duplicating business mutations.

### Layer 2 — Specialist workspaces

Specialist modules remain first-class and are available through desktop navigation and Mobile More:

- Command: Pulse, Focus, Signals, Decisions
- Execution: Outcomes, Commitments, Workspace, Schedule, Horizon, Team
- Growth: Revenue, Clients, Products, Content
- Control: Finance, Software, Knowledge, Connections
- Private: Founder OS, when authorized

These modules are where users perform deeper domain work. The simple surface does not remove them or flatten their rules.

### Layer 3 — Power views

Boards, timelines, calendars, charts, Gantt-style views, analytics, proofs, dependencies, detailed financial controls, governance, and other advanced interfaces remain available inside the relevant specialist workspace.

Power views are **progressively disclosed**. They should not be required to answer a basic daily question such as “what should I do next?”

## Navigation

### Desktop

The sidebar starts with **Start here**:

1. Home
2. Today
3. Projects
4. Inbox

The complete specialist navigation follows below it. This preserves breadth without making every module equally prominent.

### Mobile

The fixed bottom bar is:

1. Home
2. Today
3. Projects
4. Inbox
5. More

The mobile UI is not a squeezed desktop dashboard. Default cards should be vertical, readable, and decision-oriented. Avoid dense rows, unnecessary metadata, and multiple view switchers on the primary journey.

## Naming

`Projects` is the primary product language for the existing project/mission domain. The current `/missions` route and underlying data model are retained for compatibility while the user-facing entry point says Projects.

`Pulse`, `Focus`, `Outcomes`, and `Commitments` remain valid specialist concepts. They are no longer required knowledge for navigating the product day to day.

## Home composition

Home should stay intentionally selective:

1. **Do this next** — one highest-priority assigned item.
2. **Needs your attention** — overdue work, blocked work, untriaged signals, pending decisions, projects at risk.
3. **Projects** — a compact active-project health summary.

Home is not an analytics dumping ground. If a metric does not change a decision, it belongs in a specialist workspace.

## Today composition

Today combines the user's active commitments and assigned tasks into one reading order:

- **Now** — blocked or overdue
- **Today** — due today
- **This week** — due within seven days
- **Later** — future or undated

The default Today surface intentionally has no Runway/Timeline/Chart/Gantt switcher. Those capabilities can remain available in Focus, Schedule, Projects, or other specialist views.

## Inbox composition

Inbox is an attention router, not a replacement for domain workflows. It currently aggregates:

- active Signals (`new`, `triaged`)
- pending approval Decisions

Items link to the existing specialist modules for mutation, evidence, comments, approval rules, and audit behavior.

## Progressive-disclosure rules

- Show the smallest amount of information required to understand the next decision.
- Prefer plain language over internal operating terminology on Layer 1.
- Do not show the owner when the user already knows the item is theirs unless ownership changes the decision.
- Do not show a percentage merely because one exists.
- Prefer one clear primary action per mobile card.
- Avoid truncating the information required to understand the item.
- Preserve advanced controls instead of deleting them; move them deeper when they are not needed every day.
- Never make UI simplification weaken authorization, approvals, audit, finance invariants, or RLS.

## Compatibility

The redesign changes prominence and language, not the authority of existing domains. Existing specialist routes remain available, including `/pulse`, `/focus`, `/outcomes`, `/commitments`, `/workspace`, `/signals`, and `/decisions`.

The application root redirects to `/home` so the simple surface becomes the default entry point.
